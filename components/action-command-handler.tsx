"use client"

import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"
import { RoomEvent, ConnectionState } from "livekit-client"
// Types for DOM Monitor communication
interface DOMMonitorRequestData {
  type: "dom_monitor_request";
  request_id: string;
  request_type: "current_state" | "find_elements" | "get_stats";
  intent?: string;
  options?: {
    visible?: boolean;
    interactable?: boolean;
    max_elements?: number;
  };
  timestamp: number;
}

interface DOMMonitorResponseData {
  type: "dom_monitor_response";
  request_id: string;
  success: boolean;
  data?: {
    elements?: Array<{
      elementId: string;
      tagName: string;
      text: string;
      role: string;
      position: { x: number; y: number; width: number; height: number };
      visibility: boolean;
      interactable: boolean;
    }>;
    stats?: {
      totalElements: number;
      visibleElements: number;
      interactableElements: number;
      memoryUsage: number;
    };
    status?: {
      version: string;
      initialized: boolean;
      observing: boolean;
    };
    page_info?: {
      url: string;
      title: string;
      domain: string;
      timestamp: number;
    };
    truncated?: boolean;
    original_count?: number;
  };
  error?: string;
  timestamp: number;
}

/**
 * ActionCommandHandler listens for data messages coming from the backend (via LiveKit data channel)
 * and forwards structured action commands to the host page (assistant-loader.js) using postMessage.
 *
 * This component **must** be rendered somewhere inside a <LiveKitRoom> so that the LiveKit React
 * context is available (useRoom()). It returns null because it only deals with side-effects.
 */
export default function ActionCommandHandler() {
  const room = useRoomContext()
  
  // Log component render
  console.log("🐛 ActionCommandHandler: Component rendering", { 
    timestamp: new Date().toISOString(),
    roomExists: !!room 
  })
  
  // Debug states
  const [roomState, setRoomState] = useState<{
    connected: boolean
    connectionState: ConnectionState | null
    participantCount: number
  }>({ connected: false, connectionState: null, participantCount: 0 })
  
  const [lastDataMessage, setLastDataMessage] = useState<any>(null)
  const [lastActionMessage, setLastActionMessage] = useState<any>(null)
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const [messageCount, setMessageCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isDebugVisible, setIsDebugVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null)

  const addError = (error: string) => {
    console.error("ActionCommandHandler Error:", error)
    setErrors(prev => [...prev.slice(-4), error]) // Keep last 5 errors
  }

  const addToHistory = (message: any, messageType: string) => {
    const historyEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: messageType,
      data: message,
      size: JSON.stringify(message).length
    }
    
    setMessageHistory(prev => [...prev.slice(-19), historyEntry]) // Keep last 20 messages
    console.log(`📨 [${messageType}] Message added to history:`, historyEntry)
  }

  // Test function to manually send data (for debugging)
  // Function to send DOM Monitor responses back to backend
  const sendDomMonitorResponse = async (responseData: any) => {
    if (room && room.localParticipant) {
      try {
        const responseMessage = JSON.stringify(responseData)
        console.log("📤 Sending DOM Monitor response to backend:", responseMessage)
        
        await room.localParticipant.publishData(
          new TextEncoder().encode(responseMessage),
          { topic: "dom_monitor_responses" }
        )
        
        console.log("✅ DOM Monitor response sent successfully")
      } catch (error) {
        console.error("❌ Error sending DOM Monitor response:", error)
        addError(`DOM response send failed: ${error}`)
      }
    } else {
      console.error("❌ Cannot send DOM Monitor response: no room connection")
      addError("Cannot send DOM response: no room connection")
    }
  }

  // NEW: Proactive DOM state streaming
  const startDOMStateStreaming = () => {
    console.log("🔄 Starting proactive DOM state streaming...")
    
    // Stream DOM state every 3 seconds
    const streamInterval = setInterval(() => {
      if (room && room.localParticipant && window.AIAssistantDOMMonitor) {
        try {
          const domStats = window.AIAssistantDOMMonitor.getStats()
          const allElements = window.AIAssistantDOMMonitor.getAllElements({
            visible: true,
            interactable: true
          })
          
          const domStateMessage = {
            type: "dom_state_update",
            timestamp: Date.now(),
            stats: domStats,
            elements: allElements.slice(0, 50), // Limit to 50 most relevant elements
            website_url: window.location.href,
            page_title: document.title
          }
          
          // Send to backend
          room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify(domStateMessage)),
            { topic: "dom_state_updates" }
          )
          
          console.log(`📊 Streamed DOM state: ${allElements.length} elements`)
        } catch (error) {
          console.warn("⚠️ DOM state streaming error:", error)
        }
      }
    }, 3000) // Every 3 seconds
    
    // Send immediate update on DOM changes
    if (window.AIAssistantDOMMonitor && window.AIAssistantDOMMonitor._internal) {
      const monitor = window.AIAssistantDOMMonitor._internal.monitor
      const originalObserver = monitor.observer
      
      // Enhance observer to send immediate updates
      if (originalObserver && originalObserver.notifyDOMChanges) {
        const originalNotify = originalObserver.notifyDOMChanges.bind(originalObserver)
        originalObserver.notifyDOMChanges = (changes : any) => {
          originalNotify(changes)
          
          // Send immediate update for significant changes
          if (changes.added > 0 || changes.removed > 0) {
            setTimeout(() => {
              if (room && room.localParticipant && window.AIAssistantDOMMonitor) {
                const quickUpdate = {
                  type: "dom_state_update",
                  timestamp: Date.now(),
                  trigger: "dom_change",
                  stats: window.AIAssistantDOMMonitor.getStats(),
                  elements: window.AIAssistantDOMMonitor.getAllElements({
                    visible: true,
                    interactable: true
                  }).slice(0, 20)
                }
                
                room.localParticipant.publishData(
                  new TextEncoder().encode(JSON.stringify(quickUpdate)),
                  { topic: "dom_state_updates" }
                )
                
                console.log("🔄 Sent immediate DOM change update")
              }
            }, 500) // Small delay to let changes settle
          }
        }
      }
    }
    
    // Cleanup function
    return () => {
      clearInterval(streamInterval)
      console.log("🛑 Stopped DOM state streaming")
    }
  }

  const sendTestData = async () => {
    if (room && room.localParticipant) {
      try {
        const testPayload = {
          type: "execute_actions",
          actions: [
            {
              action: "click",
              selector: "#test-button",
              id: "test_action_1"
            }
          ],
          website_id: "test_website",
          user_intent: "Test action from frontend"
        }
        
        const testMessage = JSON.stringify(testPayload)
        console.log("🧪 Sending test data:", testMessage)
        
        await room.localParticipant.publishData(
          new TextEncoder().encode(testMessage),
          { topic: "action_commands" }
        )
        
        console.log("✅ Test data sent successfully")
      } catch (error) {
        console.error("❌ Error sending test data:", error)
        addError(`Test send failed: ${error}`)
      }
    } else {
      console.error("❌ Cannot send test data: no room or local participant")
      addError("Cannot send test data: no room connection")
    }
  }

  const clearHistory = () => {
    setMessageHistory([])
    setSelectedHistoryIndex(null)
    console.log("🗑️ Message history cleared")
  }

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => console.log("📋 Copied to clipboard"))
      .catch(err => console.error("❌ Copy failed:", err))
  }

  useEffect(() => {
    if (!room) {
      console.log("ActionCommandHandler: Room not available yet")
      return
    }

    console.log("ActionCommandHandler: Room available, setting up listeners", {
      roomName: room.name,
      roomState: room.state,
      timestamp: new Date().toISOString()
    })
    console.log("ActionCommandHandler: Room state:", {
      name: room.name,
      state: room.state,
      isConnected: room.state === ConnectionState.Connected,
      localParticipant: room.localParticipant?.identity,
      remoteParticipants: Array.from(room.remoteParticipants.keys())
    })

    // Update room state for debug UI
    const updateRoomState = () => {
      setRoomState({
        connected: room.state === ConnectionState.Connected,
        connectionState: room.state,
        participantCount: room.remoteParticipants.size + 1 // +1 for local
      })
    }

    updateRoomState()

    // Listen for connection state changes
    const handleConnectionStateChanged = (state: ConnectionState) => {
      console.log("ActionCommandHandler: Connection state changed to:", state)
      updateRoomState()
    }

    // Start DOM state streaming when connected
    let stopDOMStreaming: (() => void) | null = null
    if (room.state === ConnectionState.Connected) {
      stopDOMStreaming = startDOMStateStreaming()
    }
    
    // Start streaming when connection is established
    const originalHandler = handleConnectionStateChanged
    const enhancedConnectionHandler = (state: ConnectionState) => {
      originalHandler(state)
      
      if (state === ConnectionState.Connected && !stopDOMStreaming) {
        console.log("🚀 Room connected - starting DOM state streaming")
        stopDOMStreaming = startDOMStateStreaming()
      } else if (state !== ConnectionState.Connected && stopDOMStreaming) {
        console.log("🛑 Room disconnected - stopping DOM state streaming")
        stopDOMStreaming()
        stopDOMStreaming = null
      }
    }

      // Enhanced data received handler following LiveKit documentation
  const handleDataReceived = (
    payload: Uint8Array,
    participant?: any,
    kind?: any,
    topic?: string
  ) => {
    try {
      console.log("ActionCommandHandler: LiveKit data received:", {
        payloadLength: payload.length,
        participant: participant?.identity,
        kind,
        topic,
        timestamp: new Date().toISOString()
      })

      setMessageCount(prev => prev + 1)
      // Make debug panel visible when data is received
      setIsDebugVisible(true)
      setIsMinimized(false)

      // Decode following LiveKit documentation
      const textDecoder = new TextDecoder()
      const decodedText = textDecoder.decode(payload)
      console.log("ActionCommandHandler: Decoded LiveKit message:", decodedText.slice(0, 200) + "...")

      // Parse JSON data
      let parsedData: any
      try {
        parsedData = JSON.parse(decodedText)
        console.log("ActionCommandHandler: Parsed LiveKit data:", {
          type: parsedData?.type,
          topic,
          size: payload.length
        })
      } catch (parseError) {
        console.log("ActionCommandHandler: Invalid JSON in LiveKit message:", decodedText)
        parsedData = { 
          type: "text", 
          content: decodedText,
          topic,
          from: participant?.identity 
        }
      }

      // Add metadata for debugging
      const messageWithMetadata = {
        ...parsedData,
        metadata: {
          timestamp: new Date().toISOString(),
          from: participant?.identity,
          topic,
          kind,
          payloadSize: payload.length,
          rawText: decodedText
        }
      }

      // Add to debug history
      addToHistory(messageWithMetadata, parsedData?.type || "unknown")
      setLastDataMessage(messageWithMetadata)

      // Handle DOM Monitor requests (following our protocol)
      if (topic === "dom_monitor_requests" && parsedData?.type === "dom_monitor_request") {
        console.log("📥 DOM Monitor request from assistant via LiveKit:", parsedData)
        handleDOMMonitorRequest(parsedData)
      } 
      // Handle action execution commands
      else if (parsedData?.type === "execute_actions" && Array.isArray(parsedData.actions)) {
        console.log("🎯 Execute actions received via LiveKit:", parsedData)
        handleExecuteActions(parsedData)
      } 
      // Log other message types
      else {
        console.log("📨 Other LiveKit message received:", {
          type: parsedData?.type,
          topic,
          hasActions: Array.isArray(parsedData?.actions),
          keys: Object.keys(parsedData || {})
        })
      }

    } catch (error) {
      const errorMsg = `Failed to process LiveKit data: ${error}`
      addError(errorMsg)
      console.error("ActionCommandHandler: Error processing LiveKit data:", error, {
        payloadLength: payload.length,
        participant: participant?.identity,
        topic
      })
    }
  }

  // Handle DOM Monitor requests via postMessage to parent window
  const handleDOMMonitorRequest = async (request: any) => {
    try {
      const { request_id, request_type, intent, options } = request
      
      console.log(`🔍 Processing DOM request via postMessage: ${request_id} (${request_type})`)
      
      // Create request for parent window
      const domRequest: DOMMonitorRequestData = {
        type: "dom_monitor_request",
        request_id,
        request_type,
        intent,
        options: options || {},
        timestamp: Date.now()
      }
      
      // Send request to parent window via postMessage (where DOM Monitor lives)
      window.parent.postMessage({
        action: "dom_monitor_request",
        payload: domRequest,
        type: "dom_monitor_request",
        request_id,
        intent,
        options: domRequest.options,
        metadata: {
          timestamp: new Date().toISOString(),
          source: "voice_assistant_iframe",
        },
      }, "*")
      
      console.log(`📤 DOM request sent to parent window: ${request_id}`)
      
      // Add to debug history
      addToHistory({
        type: "dom_monitor_request_sent",
        request_id,
        request_type,
        intent,
        success: true
      }, "dom_request_sent")
      
      // Note: Response will be handled by window message listener
      
    } catch (error: any) {
      console.error("❌ Error handling DOM request:", error)
      await sendDOMResponse({
        type: "dom_monitor_response",
        request_id: request.request_id,
        success: false,
        error: error?.message || String(error),
        timestamp: Date.now()
      })
      addError(`DOM request processing failed: ${error}`)
    }
  }

  // Send DOM response following LiveKit size limits and reliability
  const sendDOMResponse = async (responseData: any) => {
    if (!room || !room.localParticipant) {
      console.error("❌ No LiveKit room for DOM response")
      addError("No LiveKit room connection for DOM response")
      return
    }
    
    try {
      const responseJson = JSON.stringify(responseData)
      const responseBytes = new TextEncoder().encode(responseJson)
      
      // Check LiveKit size limit (15KiB for reliable delivery per documentation)
      const MAX_RELIABLE_SIZE = 15360 // 15KiB
      
      if (responseBytes.length > MAX_RELIABLE_SIZE) {
        console.warn("⚠️ DOM response exceeds LiveKit limit, truncating...", {
          originalSize: responseBytes.length,
          limit: MAX_RELIABLE_SIZE
        })
        
        // Truncate elements array if present
        if (responseData.data?.elements) {
          const maxElements = Math.floor(responseData.data.elements.length * 0.7)
          responseData.data.elements = responseData.data.elements.slice(0, maxElements)
          responseData.data.truncated = true
          responseData.data.original_count = responseData.data.elements.length
          
          const truncatedJson = JSON.stringify(responseData)
          const truncatedBytes = new TextEncoder().encode(truncatedJson)
          
          if (truncatedBytes.length <= MAX_RELIABLE_SIZE) {
            await room.localParticipant.publishData(
              truncatedBytes,
              { topic: "dom_monitor_responses", reliable: true }
            )
            console.log(`📤 Truncated DOM response sent: ${truncatedBytes.length} bytes`)
            return
          }
        }
        
        // Last resort: send error about size
        const errorResponse = {
          type: "dom_monitor_response",
          request_id: responseData.request_id,
          success: false,
          error: "Response too large for LiveKit transmission",
          size_limit: MAX_RELIABLE_SIZE,
          actual_size: responseBytes.length
        }
        
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(errorResponse)),
          { topic: "dom_monitor_responses", reliable: true }
        )
        
        console.error(`❌ DOM response too large: ${responseBytes.length} > ${MAX_RELIABLE_SIZE}`)
        addError(`DOM response too large: ${responseBytes.length} bytes`)
        
      } else {
        // Send normal response with reliable delivery
        await room.localParticipant.publishData(
          responseBytes,
          { topic: "dom_monitor_responses", reliable: true }
        )
        console.log(`📤 DOM response sent via LiveKit: ${responseBytes.length} bytes`)
      }
      
    } catch (error) {
      console.error("❌ Error sending DOM response via LiveKit:", error)
      addError(`DOM response send failed: ${error}`)
    }
  }

  // Handle action execution (existing functionality)
  const handleExecuteActions = (actionData: any) => {
    try {
      console.log("🎯 Execute actions received:", {
        actionsCount: actionData.actions.length,
        sequential: actionData.sequential_mode,
        fallback: actionData.fallback_mode,
        website_id: actionData.website_id,
        user_intent: actionData.user_intent
      })
      
      // Forward to parent window (existing pattern)
      const messageToParent = {
        action: "execute_actions",
        payload: actionData.actions,
        type: "execute_actions",
        actions: actionData.actions,
        metadata: {
          website_id: actionData.website_id,
          user_intent: actionData.user_intent,
          timestamp: new Date().toISOString(),
          source: "voice_assistant_backend",
          sequential_mode: actionData.sequential_mode || false,
          fallback_mode: actionData.fallback_mode || false
        },
      }

      console.log("📤 Forwarding actions to parent window:", messageToParent)
      window.parent.postMessage(messageToParent, "*")
      
      // Update debug state
      setLastActionMessage(actionData)
      addToHistory(actionData, "execute_actions")
      
    } catch (error) {
      console.error("❌ Error handling execute actions:", error)
      addError(`Action execution handling failed: ${error}`)
    }
  }

    // Attach event listeners
    room.on(RoomEvent.DataReceived, handleDataReceived)
    room.on(RoomEvent.ConnectionStateChanged, enhancedConnectionHandler)

    console.log("ActionCommandHandler: Event listeners attached", {
      timestamp: new Date().toISOString(),
      roomName: room.name
    })

    // Listen for DOM Monitor responses from parent window
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = event.data
        
        // Handle DOM Monitor response from parent window
        if (data && data.action === "dom_monitor_response") {
          console.log("📥 Received DOM Monitor response from parent:", data)
          
          // Convert parent response to LiveKit format and send back to backend
          const livekitResponse: DOMMonitorResponseData = {
            type: "dom_monitor_response",
            request_id: data.requestId || data.request_id,
            success: data.success || false,
            data: data.data,
            error: data.error,
            timestamp: Date.now()
          }
          
          sendDOMResponse(livekitResponse)
          
          // Add to debug history
          addToHistory({
            type: "dom_monitor_response_received",
            request_id: data.requestId || data.request_id,
            success: data.success,
            elements_found: data.data?.elements?.length || 0
          }, "dom_monitor_response")
        }
        // Handle legacy format for backward compatibility
        else if (data && data.type === "dom_monitor_response") {
          console.log("📥 Received legacy DOM Monitor response from parent:", data)
          
          // Send response back to backend via LiveKit
          sendDOMResponse(data as DOMMonitorResponseData)
          
          // Add to debug history
          addToHistory(data, "dom_monitor_response")
        }
      } catch (error: any) {
        console.error("❌ Error handling window message:", error)
        addError(`Window message error: ${error}`)
      }
    }

    window.addEventListener('message', handleWindowMessage)

    // Cleanup function
    return () => {
      console.log("ActionCommandHandler: Cleaning up event listeners", {
        timestamp: new Date().toISOString(),
        roomName: room?.name,
        reason: "Component unmounting or room changed"
      })
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.ConnectionStateChanged, enhancedConnectionHandler)
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [room])

  if (!isDebugVisible) {
    return (
      <>
        {/* Tailwind CSS animation */}
        <style jsx>{`
          @keyframes pulse-debug {
            0%, 100% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.1); }
          }
          .pulse-debug {
            animation: pulse-debug 2s infinite;
          }
        `}</style>
        <button
          onClick={() => setIsDebugVisible(true)}
          className="fixed top-1/2 left-5 -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white border-4 border-white rounded-full w-16 h-16 text-2xl cursor-pointer z-[99999] shadow-2xl pulse-debug transition-all duration-300"
          title="Show LiveKit Debug Panel"
        >
          🐛
        </button>
      </>
    )
  }

  return (
    <div className={`fixed top-12 left-5 bg-black/95 text-white rounded-lg text-xs font-mono border-2 border-green-500 shadow-2xl z-[99999] transition-all duration-300 ${
      isMinimized ? 'max-h-12' : 'max-h-[600px]'
    } max-w-[500px] overflow-hidden`}>
      {/* Header with controls */}
      <div 
        className="bg-green-500 px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-green-600 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="font-bold text-white">
          🐛 LiveKit Debug {messageCount > 0 && `(${messageCount} msgs)`}
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearHistory()
            }}
            className="bg-transparent border-none text-white cursor-pointer text-sm hover:bg-white/20 px-1 rounded transition-colors"
            title="Clear History"
          >
            🗑️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
            className="bg-transparent border-none text-white cursor-pointer text-sm hover:bg-white/20 px-1 rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? '📈' : '📉'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsDebugVisible(false)
            }}
            className="bg-transparent border-none text-white cursor-pointer text-sm hover:bg-white/20 px-1 rounded transition-colors"
            title="Hide Debug Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <div className="p-4 max-h-[550px] overflow-auto">
          <div className="mb-3">
            <strong>Room Status:</strong><br/>
            Connected: {roomState.connected ? '✅' : '❌'}<br/>
            State: {roomState.connectionState}<br/>
            Participants: {roomState.participantCount}<br/>
            Messages Received: <span className={messageCount > 0 ? 'text-green-400' : 'text-orange-400'}>{messageCount}</span><br/>
            History Count: <span className="text-blue-400">{messageHistory.length}</span>
          </div>

          {/* Test button for debugging */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={sendTestData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
              title="Send test data message"
            >
              🧪 Test
            </button>
            <button
              onClick={clearHistory}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
              title="Clear message history"
            >
              🗑️ Clear
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mb-3 text-red-400">
              <strong>Errors:</strong><br/>
              {errors.map((error, i) => (
                <div key={i} className="text-[10px] mb-1">
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Message History */}
          {messageHistory.length > 0 && (
            <div className="mb-3">
              <strong className="text-blue-400">📜 Message History ({messageHistory.length}):</strong><br/>
              <div className="max-h-40 overflow-auto bg-white/5 rounded p-2 mt-1">
                {messageHistory.map((msg, index) => (
                  <div 
                    key={msg.id}
                    className={`cursor-pointer p-1 rounded mb-1 text-[10px] ${
                      selectedHistoryIndex === index ? 'bg-blue-500/30' : 'hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedHistoryIndex(selectedHistoryIndex === index ? null : index)}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${
                        msg.type === 'execute_actions' ? 'text-green-400' : 
                        msg.type === 'text' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {msg.type}
                      </span>
                      <div className="flex gap-1">
                        <span className="text-gray-400">{msg.size}B</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(msg.data)
                          }}
                          className="text-gray-400 hover:text-white"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    {msg.type === 'execute_actions' && msg.data.actions && (
                      <div className="text-green-300">
                        {msg.data.actions.length} action(s): {msg.data.actions.map((a: any) => a.action).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Message Details */}
          {selectedHistoryIndex !== null && messageHistory[selectedHistoryIndex] && (
            <div className="mb-3">
              <strong className="text-purple-400">🔍 Selected Message Details:</strong><br/>
              <div className="bg-purple-500/20 p-2 rounded text-[10px] max-h-32 overflow-auto">
                <pre>{JSON.stringify(messageHistory[selectedHistoryIndex].data, null, 2)}</pre>
              </div>
            </div>
          )}

          {lastDataMessage && (
            <div className="mb-3">
              <strong>📨 Last Data Message:</strong><br/>
              <div className="bg-white/10 p-2 rounded text-[10px] max-h-24 overflow-auto">
                <pre>{JSON.stringify(lastDataMessage, null, 2)}</pre>
              </div>
            </div>
          )}

          {lastActionMessage && (
            <div className="mb-3">
              <strong className="text-green-400">🎯 Last Action Message:</strong><br/>
              <div className="bg-green-500/20 p-2 rounded text-[10px] max-h-24 overflow-auto">
                <pre>{JSON.stringify(lastActionMessage, null, 2)}</pre>
              </div>
              {lastActionMessage.actions && (
                <div className="mt-2">
                  <strong className="text-green-300">Action Summary:</strong><br/>
                  {lastActionMessage.actions.map((action: any, index: number) => (
                    <div key={index} className="text-[10px] bg-green-900/30 p-1 rounded mb-1">
                      <span className="text-green-400">{index + 1}.</span> {action.action}
                      {action.value && <span className="text-yellow-300"> = "{action.value}"</span>}
                      {action.selector && <span className="text-blue-300"> @ {action.selector}</span>}
                      {action.options?.description && <span className="text-gray-300"> ({action.options.description})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {messageCount === 0 && roomState.connected && (
            <div className="text-orange-400">
              ⚠️ Room connected but no data messages received yet
            </div>
          )}

          {!roomState.connected && (
            <div className="text-red-400">
              ❌ Room not connected - data messages won't be received
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
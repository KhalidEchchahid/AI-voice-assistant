"use client"

import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"
import { RoomEvent, ConnectionState } from "livekit-client"

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

    // Listen for ALL data messages (not just execute_actions)
    const handleDataReceived = (
      payload: Uint8Array,
      participant?: any,
      kind?: any,
      topic?: string
    ) => {
      try {
        console.log("ActionCommandHandler: Raw data received:", {
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

        // Decode the payload
        const textDecoder = new TextDecoder()
        const decodedText = textDecoder.decode(payload)
        console.log("ActionCommandHandler: Decoded text:", decodedText)

        // Try to parse as JSON
        let parsedData: any
        try {
          parsedData = JSON.parse(decodedText)
          console.log("ActionCommandHandler: Parsed JSON data:", parsedData)
        } catch (parseError) {
          console.log("ActionCommandHandler: Not JSON data, treating as plain text:", decodedText)
          parsedData = { 
            type: "text", 
            content: decodedText,
            topic,
            from: participant?.identity 
          }
        }

        // Add metadata
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

        // Add to history
        addToHistory(messageWithMetadata, parsedData?.type || "unknown")

        // Update debug state with last received message
        setLastDataMessage(messageWithMetadata)

        // Check message type and handle accordingly
        if (parsedData && parsedData.type === "dom_monitor_request") {
          console.log("ActionCommandHandler: DOM Monitor request received:", parsedData)
          
          // Forward DOM Monitor request to parent window
          const domRequestMessage = {
            action: "dom_monitor_request",
            payload: parsedData,
            type: "dom_monitor_request",
            request_id: parsedData.request_id,
            intent: parsedData.intent,
            options: parsedData.options,
            metadata: {
              timestamp: new Date().toISOString(),
              source: "voice_assistant_backend",
            },
          }

          console.log("ActionCommandHandler: Forwarding DOM Monitor request to parent:", domRequestMessage)
          window.parent.postMessage(domRequestMessage, "*")
          
          // Add to history
          setLastDataMessage({...messageWithMetadata, forwarded_as_dom_request: true})
        } 
        // Check if this is an execute_actions message
        else if (parsedData && parsedData.type === "execute_actions" && Array.isArray(parsedData.actions)) {
          console.log("ActionCommandHandler: Execute actions message received:", parsedData)
          console.log("🎯 ACTION DETAILS:", {
            actionsCount: parsedData.actions.length,
            actions: parsedData.actions.map((action: any, index: number) => ({
              index,
              action: action.action,
              selector: action.selector,
              xpath: action.xpath,
              value: action.value,
              text: action.text,
              options: action.options,
              id: action.id,
              command_id: action.command_id
            })),
            website_id: parsedData.website_id,
            user_intent: parsedData.user_intent
          })
          
          setLastActionMessage(parsedData)

          // Post message to parent window
          const messageToParent = {
            action: "execute_actions",
            payload: parsedData.actions,
            type: "execute_actions",
            actions: parsedData.actions,
            metadata: {
              website_id: parsedData.website_id,
              user_intent: parsedData.user_intent,
              timestamp: new Date().toISOString(),
              source: "voice_assistant_backend",
            },
          }

          console.log("ActionCommandHandler: Posting message to parent:", messageToParent)
          window.parent.postMessage(messageToParent, "*")
        } else {
          console.log("ActionCommandHandler: Non-action message received:", {
            type: parsedData?.type,
            hasActions: Array.isArray(parsedData?.actions),
            actionCount: parsedData?.actions?.length,
            keys: Object.keys(parsedData || {})
          })
        }

      } catch (error) {
        const errorMsg = `Failed to process data message: ${error}`
        addError(errorMsg)
        console.error("ActionCommandHandler: Error processing data:", error, {
          payloadLength: payload.length,
          participant: participant?.identity,
          topic
        })
      }
    }

    // Attach event listeners
    room.on(RoomEvent.DataReceived, handleDataReceived)
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)

    console.log("ActionCommandHandler: Event listeners attached", {
      timestamp: new Date().toISOString(),
      roomName: room.name
    })

    // Listen for DOM Monitor responses from parent window
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = event.data
        if (data && data.type === "dom_monitor_response") {
          console.log("📥 Received DOM Monitor response from parent:", data)
          
          // Send response back to backend via LiveKit
          sendDomMonitorResponse(data)
          
          // Add to debug history
          addToHistory(data, "dom_monitor_response")
        }
      } catch (error) {
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
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
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
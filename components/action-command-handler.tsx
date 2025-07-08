"use client"

import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"
import { RoomEvent, ConnectionState } from "livekit-client"
import {
  Bug,
  Trash2,
  Minimize2,
  Maximize2,
  X,
  Copy,
  TestTube,
  Activity,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react"

// Types for DOM Monitor communication
interface DOMMonitorRequestData {
  type: "dom_monitor_request"
  request_id: string
  request_type: "current_state" | "find_elements" | "get_stats"
  intent?: string
  options?: {
    visible?: boolean
    interactable?: boolean
    max_elements?: number
  }
  timestamp: number
}

interface DOMMonitorResponseData {
  type: "dom_monitor_response"
  request_id: string
  success: boolean
  data?: {
    elements?: Array<{
      elementId: string
      tagName: string
      text: string
      role: string
      position: { x: number; y: number; width: number; height: number }
      visibility: boolean
      interactable: boolean
    }>
    stats?: {
      totalElements: number
      visibleElements: number
      interactableElements: number
      memoryUsage: number
    }
    status?: {
      version: string
      initialized: boolean
      observing: boolean
    }
    page_info?: {
      url: string
      title: string
      domain: string
      timestamp: number
    }
    truncated?: boolean
    original_count?: number
  }
  error?: string
  timestamp: number
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
    roomExists: !!room,
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
    setErrors((prev) => [...prev.slice(-4), error]) // Keep last 5 errors
  }

  const addToHistory = (message: any, messageType: string) => {
    const historyEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: messageType,
      data: message,
      size: JSON.stringify(message).length,
    }

    setMessageHistory((prev) => [...prev.slice(-19), historyEntry]) // Keep last 20 messages
    console.log(`📨 [${messageType}] Message added to history:`, historyEntry)
  }

  // Test function to manually send data (for debugging)
  // Function to send DOM Monitor responses back to backend
  const sendDomMonitorResponse = async (responseData: any) => {
    if (room && room.localParticipant) {
      try {
        const responseMessage = JSON.stringify(responseData)
        console.log("📤 Sending DOM Monitor response to backend:", responseMessage)

        await room.localParticipant.publishData(new TextEncoder().encode(responseMessage), {
          topic: "dom_monitor_responses",
        })

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
            interactable: true,
          })

          const domStateMessage = {
            type: "dom_state_update",
            timestamp: Date.now(),
            stats: domStats,
            elements: allElements.slice(0, 50), // Limit to 50 most relevant elements
            website_url: window.location.href,
            page_title: document.title,
          }

          // Send to backend
          room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(domStateMessage)), {
            topic: "dom_state_updates",
          })

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
        originalObserver.notifyDOMChanges = (changes: any) => {
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
                    interactable: true,
                  }).slice(0, 20),
                }

                room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(quickUpdate)), {
                  topic: "dom_state_updates",
                })

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
              id: "test_action_1",
            },
          ],
          website_id: "test_website",
          user_intent: "Test action from frontend",
        }

        const testMessage = JSON.stringify(testPayload)
        console.log("🧪 Sending test data:", testMessage)

        await room.localParticipant.publishData(new TextEncoder().encode(testMessage), { topic: "action_commands" })

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
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 2))
      .then(() => console.log("📋 Copied to clipboard"))
      .catch((err) => console.error("❌ Copy failed:", err))
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "execute_actions":
        return <Zap className="w-3 h-3" />
      case "dom_monitor_request":
        return <Eye className="w-3 h-3" />
      case "dom_monitor_response":
        return <EyeOff className="w-3 h-3" />
      case "text":
        return <MessageSquare className="w-3 h-3" />
      default:
        return <Activity className="w-3 h-3" />
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "execute_actions":
        return "text-emerald-400"
      case "dom_monitor_request":
        return "text-blue-400"
      case "dom_monitor_response":
        return "text-cyan-400"
      case "text":
        return "text-amber-400"
      default:
        return "text-gray-400"
    }
  }

  useEffect(() => {
    if (!room) {
      console.log("ActionCommandHandler: Room not available yet")
      return
    }

    console.log("ActionCommandHandler: Room available, setting up listeners", {
      roomName: room.name,
      roomState: room.state,
      timestamp: new Date().toISOString(),
    })
    console.log("ActionCommandHandler: Room state:", {
      name: room.name,
      state: room.state,
      isConnected: room.state === ConnectionState.Connected,
      localParticipant: room.localParticipant?.identity,
      remoteParticipants: Array.from(room.remoteParticipants.keys()),
    })

    // Update room state for debug UI
    const updateRoomState = () => {
      setRoomState({
        connected: room.state === ConnectionState.Connected,
        connectionState: room.state,
        participantCount: room.remoteParticipants.size + 1, // +1 for local
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
    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      try {
        console.log("ActionCommandHandler: LiveKit data received:", {
          payloadLength: payload.length,
          participant: participant?.identity,
          kind,
          topic,
          timestamp: new Date().toISOString(),
        })

        setMessageCount((prev) => prev + 1)
        // DEMO MODE: Debug panel auto-show disabled for demo
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
            size: payload.length,
          })
        } catch (parseError) {
          console.log("ActionCommandHandler: Invalid JSON in LiveKit message:", decodedText)
          parsedData = {
            type: "text",
            content: decodedText,
            topic,
            from: participant?.identity,
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
            rawText: decodedText,
          },
        }

        // Add to debug history
        addToHistory(messageWithMetadata, parsedData?.type || "unknown")
        setLastDataMessage(messageWithMetadata)

        // Handle DOM Monitor requests (following our protocol)
        if (topic === "dom_monitor_requests" && parsedData?.type === "dom_monitor_request") {
          console.log("📥 DOM Monitor request from assistant via LiveKit:", parsedData)
          handleDOMMonitorRequest(parsedData)
        }
        // Handle test messages for debugging
        else if (topic === "dom_monitor_requests" && parsedData?.type === "dom_monitor_test") {
          console.log("🧪 DOM Monitor test message received:", parsedData)
          // Send a test response back
          sendDOMResponse({
            type: "dom_monitor_response",
            request_id: parsedData.test_id || "test_response",
            success: true,
            data: {
              message: "Test connection successful!",
              timestamp: Date.now()
            },
            timestamp: Date.now()
          })
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
            keys: Object.keys(parsedData || {}),
          })
        }
      } catch (error) {
        const errorMsg = `Failed to process LiveKit data: ${error}`
        addError(errorMsg)
        console.error("ActionCommandHandler: Error processing LiveKit data:", error, {
          payloadLength: payload.length,
          participant: participant?.identity,
          topic,
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
          timestamp: Date.now(),
        }

        // Send request to parent window via postMessage (where DOM Monitor lives)
        window.parent.postMessage(
          {
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
          },
          "*",
        )

        console.log(`📤 DOM request sent to parent window: ${request_id}`)

        // Add to debug history
        addToHistory(
          {
            type: "dom_monitor_request_sent",
            request_id,
            request_type,
            intent,
            success: true,
          },
          "dom_request_sent",
        )

        // Note: Response will be handled by window message listener
      } catch (error: any) {
        console.error("❌ Error handling DOM request:", error)
        await sendDOMResponse({
          type: "dom_monitor_response",
          request_id: request.request_id,
          success: false,
          error: error?.message || String(error),
          timestamp: Date.now(),
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
            limit: MAX_RELIABLE_SIZE,
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
              await room.localParticipant.publishData(truncatedBytes, {
                topic: "dom_monitor_responses",
                reliable: true,
              })
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
            actual_size: responseBytes.length,
          }

          await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(errorResponse)), {
            topic: "dom_monitor_responses",
            reliable: true,
          })

          console.error(`❌ DOM response too large: ${responseBytes.length} > ${MAX_RELIABLE_SIZE}`)
          addError(`DOM response too large: ${responseBytes.length} bytes`)
        } else {
          // Send normal response with reliable delivery
          await room.localParticipant.publishData(responseBytes, { topic: "dom_monitor_responses", reliable: true })
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
          user_intent: actionData.user_intent,
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
            fallback_mode: actionData.fallback_mode || false,
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
      roomName: room.name,
    })

    // Listen for DOM Monitor responses from parent window
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = event.data

        // ENHANCED LOGGING: Log all window messages for debugging
        if (data && (data.action === "dom_monitor_response" || data.type === "dom_monitor_response")) {
          console.log("🎯 DOM MONITOR RESPONSE RECEIVED - Full Details:", {
            source: event.origin,
            timestamp: new Date().toISOString(),
            data: data,
            dataSize: JSON.stringify(data).length,
            hasElements: !!data.data?.elements,
            elementsCount: data.data?.elements?.length || 0,
            success: data.success,
            error: data.error
          })

          // Log individual elements if found
          if (data.data?.elements && data.data.elements.length > 0) {
            console.log("🔍 DOM MONITOR FOUND ELEMENTS:", data.data.elements.map((el: any, index: number) => ({
              index: index + 1,
              text: el.text?.slice(0, 50) + "...",
              tag: el.tagName,
              role: el.role,
              visible: el.visibility,
              interactable: el.interactable,
              selectors: el.selectors?.map((s: any) => `${s.type}: ${s.value}`),
              confidence: el.confidence
            })))
          } else {
            console.log("❌ DOM MONITOR: No elements found or response failed")
          }
        }

        // Handle DOM Monitor response from parent window
        if (data && data.action === "dom_monitor_response") {
          console.log("📥 Processing DOM Monitor response (action format):", data.requestId || data.request_id)

          // Convert parent response to LiveKit format and send back to backend
          const livekitResponse: DOMMonitorResponseData = {
            type: "dom_monitor_response",
            request_id: data.requestId || data.request_id,
            success: data.success || false,
            data: data.data,
            error: data.error,
            timestamp: Date.now(),
          }

          console.log("📤 SENDING DOM RESPONSE TO BACKEND:", {
            request_id: livekitResponse.request_id,
            success: livekitResponse.success,
            elements_count: livekitResponse.data?.elements?.length || 0,
            response_size: JSON.stringify(livekitResponse).length
          })

          sendDOMResponse(livekitResponse)

          // Add to debug history with enhanced details
          addToHistory(
            {
              type: "dom_monitor_response_received",
              request_id: data.requestId || data.request_id,
              success: data.success,
              elements_found: data.data?.elements?.length || 0,
              raw_response: data,
              livekit_response: livekitResponse
            },
            "dom_monitor_response",
          )
        }
        // Handle legacy format for backward compatibility
        else if (data && data.type === "dom_monitor_response") {
          console.log("📥 Processing DOM Monitor response (legacy format):", data.request_id)

          console.log("📤 SENDING LEGACY DOM RESPONSE TO BACKEND:", {
            request_id: data.request_id,
            success: data.success,
            elements_count: data.data?.elements?.length || 0,
            response_size: JSON.stringify(data).length
          })

          // Send response back to backend via LiveKit
          sendDOMResponse(data as DOMMonitorResponseData)

          // Add to debug history
          addToHistory({
            ...data,
            response_type: "legacy_format"
          }, "dom_monitor_response")
        }
        // Log all other window messages for debugging
        else if (data && (data.action || data.type)) {
          console.log("📨 Other window message received:", {
            action: data.action,
            type: data.type,
            source: event.origin,
            keys: Object.keys(data)
          })
        }
      } catch (error: any) {
        console.error("❌ Error handling window message:", error)
        addError(`Window message error: ${error}`)
      }
    }

    window.addEventListener("message", handleWindowMessage)

    // Cleanup function
    return () => {
      console.log("ActionCommandHandler: Cleaning up event listeners", {
        timestamp: new Date().toISOString(),
        roomName: room?.name,
        reason: "Component unmounting or room changed",
      })
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.ConnectionStateChanged, enhancedConnectionHandler)
      window.removeEventListener("message", handleWindowMessage)

      if (stopDOMStreaming) {
        stopDOMStreaming()
      }
    }
  }, [room])

  if (!isDebugVisible) {
    return (
      <button
        onClick={() => setIsDebugVisible(true)}
        className="fixed top-1/2 left-4 -translate-y-1/2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-full w-12 h-12 flex items-center justify-center cursor-pointer z-[99999] shadow-2xl shadow-violet-500/25 transition-all duration-300 hover:scale-110 animate-pulse"
        title="Show LiveKit Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      className={`fixed top-4 left-4 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl text-white rounded-xl border border-violet-500/30 shadow-2xl shadow-violet-500/10 z-[99999] transition-all duration-300 ${
        isMinimized ? "max-h-16" : "max-h-[600px]"
      } max-w-[500px] overflow-hidden`}
    >
      {/* Enhanced Header */}
      <div
        className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 flex justify-between items-center cursor-pointer hover:from-violet-600 hover:to-purple-700 transition-all duration-300"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center space-x-2">
          <Bug className="w-4 h-4" />
          <span className="font-semibold text-sm">LiveKit Debug</span>
          {messageCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{messageCount}</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearHistory()
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors duration-200"
            title="Clear History"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors duration-200"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsDebugVisible(false)
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors duration-200"
            title="Hide Debug Panel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <div className="p-4 max-h-[550px] overflow-auto custom-scrollbar">
          {/* Status Section */}
          <div className="mb-4 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600/30">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-violet-400" />
              <span className="font-medium text-sm">Room Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                {roomState.connected ? (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span className={roomState.connected ? "text-emerald-400" : "text-red-400"}>
                  {roomState.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400">{roomState.participantCount} participants</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3 h-3 text-amber-400" />
                <span className={messageCount > 0 ? "text-emerald-400" : "text-orange-400"}>
                  {messageCount} messages
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400">{messageHistory.length} in history</span>
              </div>
            </div>
            {roomState.connectionState && (
              <div className="mt-2 text-xs text-gray-400">State: {roomState.connectionState}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={sendTestData}
              className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
              title="Send test data message"
            >
              <TestTube className="w-3 h-3" />
              <span>Test</span>
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center space-x-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
              title="Clear message history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg border border-red-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="font-medium text-sm text-red-400">Recent Errors</span>
              </div>
              <div className="space-y-1">
                {errors.map((error, i) => (
                  <div key={i} className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message History */}
          {messageHistory.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-sm text-blue-400">Message History ({messageHistory.length})</span>
              </div>
              <div className="max-h-40 overflow-auto bg-gray-800/30 rounded-lg p-2 space-y-1 custom-scrollbar">
                {messageHistory.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`cursor-pointer p-2 rounded-lg text-xs transition-all duration-200 ${
                      selectedHistoryIndex === index
                        ? "bg-violet-500/30 border border-violet-500/50"
                        : "hover:bg-gray-700/50 border border-transparent"
                    }`}
                    onClick={() => setSelectedHistoryIndex(selectedHistoryIndex === index ? null : index)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className={`${getMessageTypeColor(msg.type)}`}>{getMessageTypeIcon(msg.type)}</span>
                        <span className={`font-medium ${getMessageTypeColor(msg.type)}`}>{msg.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">{msg.size}B</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(msg.data)
                          }}
                          className="text-gray-400 hover:text-white transition-colors duration-200"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    {msg.type === "execute_actions" && msg.data.actions && (
                      <div className="text-emerald-300 mt-1">
                        {msg.data.actions.length} action(s): {msg.data.actions.map((a: any) => a.action).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Message Details */}
          {selectedHistoryIndex !== null && messageHistory[selectedHistoryIndex] && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm text-purple-400">Selected Message Details</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-lg text-xs max-h-32 overflow-auto custom-scrollbar">
                <pre className="text-purple-200">
                  {JSON.stringify(messageHistory[selectedHistoryIndex].data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Last Data Message */}
          {lastDataMessage && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-medium text-sm text-cyan-400">Last Data Message</span>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-lg text-xs max-h-24 overflow-auto custom-scrollbar">
                <pre className="text-cyan-200">{JSON.stringify(lastDataMessage, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Last Action Message */}
          {lastActionMessage && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-sm text-emerald-400">Last Action Message</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-xs max-h-24 overflow-auto custom-scrollbar">
                <pre className="text-emerald-200">{JSON.stringify(lastActionMessage, null, 2)}</pre>
              </div>
              {lastActionMessage.actions && (
                <div className="mt-2">
                  <span className="font-medium text-emerald-300 text-xs">Action Summary:</span>
                  <div className="mt-1 space-y-1">
                    {lastActionMessage.actions.map((action: any, index: number) => (
                      <div key={index} className="text-xs bg-emerald-900/20 border border-emerald-500/20 p-2 rounded">
                        <span className="text-emerald-400 font-medium">{index + 1}.</span> {action.action}
                        {action.value && <span className="text-amber-300"> = "{action.value}"</span>}
                        {action.selector && <span className="text-blue-300"> @ {action.selector}</span>}
                        {action.options?.description && (
                          <span className="text-gray-300"> ({action.options.description})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
          {messageCount === 0 && roomState.connected && (
            <div className="text-orange-400 text-xs p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Room connected but no data messages received yet</span>
            </div>
          )}

          {!roomState.connected && (
            <div className="text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
              <XCircle className="w-4 h-4" />
              <span>Room not connected - data messages won't be received</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

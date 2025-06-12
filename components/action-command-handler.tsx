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
  const [messageCount, setMessageCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isDebugVisible, setIsDebugVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)

  const addError = (error: string) => {
    console.error("ActionCommandHandler Error:", error)
    setErrors(prev => [...prev.slice(-4), error]) // Keep last 5 errors
  }

  // Test function to manually send data (for debugging)
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

        // Update debug state with last received message
        setLastDataMessage({
          ...parsedData,
          metadata: {
            timestamp: new Date().toISOString(),
            from: participant?.identity,
            topic,
            kind,
            payloadSize: payload.length
          }
        })

        // Check if this is an execute_actions message
        if (parsedData && parsedData.type === "execute_actions" && Array.isArray(parsedData.actions)) {
          console.log("ActionCommandHandler: Execute actions message received:", parsedData)
          
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
            actionCount: parsedData?.actions?.length
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

    // Cleanup function
    return () => {
      console.log("ActionCommandHandler: Cleaning up event listeners", {
        timestamp: new Date().toISOString(),
        roomName: room?.name,
        reason: "Component unmounting or room changed"
      })
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    }
  }, [room])

  // Temporarily show in all environments for debugging
  // if (process.env.NODE_ENV === 'production') {
  //   return null
  // }

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
    } max-w-[450px] overflow-hidden`}>
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
            Messages Received: <span className={messageCount > 0 ? 'text-green-400' : 'text-orange-400'}>{messageCount}</span>
          </div>

          {/* Test button for debugging */}
          <div className="mb-3">
            <button
              onClick={sendTestData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
              title="Send test data message"
            >
              🧪 Send Test Data
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

          {lastDataMessage && (
            <div className="mb-3">
              <strong>Last Data Message:</strong><br/>
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
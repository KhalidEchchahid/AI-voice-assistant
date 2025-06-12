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

  useEffect(() => {
    if (!room) {
      console.log("ActionCommandHandler: Room not available yet")
      return
    }

    console.log("ActionCommandHandler: Room available, setting up listeners")
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

    console.log("ActionCommandHandler: Event listeners attached")

    // Cleanup function
    return () => {
      console.log("ActionCommandHandler: Cleaning up event listeners")
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    }
  }, [room])

  // Only show debug UI in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  if (!isDebugVisible) {
    return (
      <button
        onClick={() => setIsDebugVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}
        title="Show LiveKit Debug Panel"
      >
        🐛
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.95)',
      color: 'white',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '450px',
      maxHeight: isMinimized ? '50px' : '600px',
      overflow: 'hidden',
      zIndex: 9999,
      fontFamily: 'monospace',
      border: '2px solid #4CAF50',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Header with controls */}
      <div style={{ 
        background: '#4CAF50', 
        padding: '8px 15px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={{ fontWeight: 'bold', color: 'white' }}>
          🐛 LiveKit Debug {messageCount > 0 && `(${messageCount} msgs)`}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? '📈' : '📉'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsDebugVisible(false)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Hide Debug Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <div style={{ padding: '15px', maxHeight: '550px', overflow: 'auto' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>Room Status:</strong><br/>
            Connected: {roomState.connected ? '✅' : '❌'}<br/>
            State: {roomState.connectionState}<br/>
            Participants: {roomState.participantCount}<br/>
            Messages Received: <span style={{color: messageCount > 0 ? '#4CAF50' : '#ff9800'}}>{messageCount}</span>
          </div>

          {errors.length > 0 && (
            <div style={{ marginBottom: '10px', color: '#ff6b6b' }}>
              <strong>Errors:</strong><br/>
              {errors.map((error, i) => (
                <div key={i} style={{ fontSize: '10px', marginBottom: '2px' }}>
                  {error}
                </div>
              ))}
            </div>
          )}

          {lastDataMessage && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Last Data Message:</strong><br/>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                padding: '5px', 
                borderRadius: '4px',
                fontSize: '10px',
                maxHeight: '100px',
                overflow: 'auto'
              }}>
                <pre>{JSON.stringify(lastDataMessage, null, 2)}</pre>
              </div>
            </div>
          )}

          {lastActionMessage && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{color: '#4CAF50'}}>🎯 Last Action Message:</strong><br/>
              <div style={{ 
                background: 'rgba(76, 175, 80, 0.2)', 
                padding: '5px', 
                borderRadius: '4px',
                fontSize: '10px',
                maxHeight: '100px',
                overflow: 'auto'
              }}>
                <pre>{JSON.stringify(lastActionMessage, null, 2)}</pre>
              </div>
            </div>
          )}

          {messageCount === 0 && roomState.connected && (
            <div style={{ color: '#ff9800' }}>
              ⚠️ Room connected but no data messages received yet
            </div>
          )}

          {!roomState.connected && (
            <div style={{ color: '#ff6b6b' }}>
              ❌ Room not connected - data messages won't be received
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
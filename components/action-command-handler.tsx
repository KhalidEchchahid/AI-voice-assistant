"use client"

import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"

/**
 * ActionCommandHandler listens for data messages coming from the backend (via LiveKit data channel)
 * and forwards structured action commands to the host page (assistant-loader.js) using postMessage.
 *
 * This component **must** be rendered somewhere inside a <LiveKitRoom> so that the LiveKit React
 * context is available (useRoom()). It returns null because it only deals with side-effects.
 */
export default function ActionCommandHandler() {
  // Grab the current LiveKit Room instance from React context
  const room = useRoomContext()

  // Debug state: last received data message (parsed JSON)
  const [lastAgentMessage, setLastAgentMessage] = useState<any>(null)

  useEffect(() => {
    if (!room) return

    /**
     * Handler fired for every data message that arrives over the LiveKit data channel.
     * We expect the backend to send UTF-8 encoded JSON strings describing actions.
     */
    function handleData(
      payload: Uint8Array,
      _participant: any,
      _kind: any,
      _topic?: string,
    ) {
      try {
        const decoder = new TextDecoder("utf-8")
        const jsonString = decoder.decode(payload)

        // Try to parse the JSON payload
        const data = JSON.parse(jsonString)
        setLastAgentMessage(data)

        // Always forward the raw data so the helper can decide what to do with it
        const baseMessage = {
          action: "livekit_data_received",
          data: jsonString,
        }

        // If this looks like an execute_actions command, send the dedicated message as well
        if (data && data.type === "execute_actions" && Array.isArray(data.actions)) {
          console.log("ActionCommandHandler: posting execute_actions to parent", data)
          window.parent.postMessage(
            {
              action: "execute_actions",
              payload: data.actions,
              type: "execute_actions",
              actions: data.actions,
              metadata: {
                website_id: data.website_id,
                user_intent: data.user_intent,
                timestamp: new Date().toISOString(),
                source: "voice_assistant_backend",
              },
            },
            "*",
          )
        }

        // Forward the generic data message (helps with debugging / other message types)
        window.parent.postMessage(baseMessage, "*")
      } catch (err) {
        setLastAgentMessage({ error: String(err) })
      }
    }

    // Attach listener
    room.on("dataReceived", handleData)

    // Cleanup listener on unmount
    return () => {
      room.off("dataReceived", handleData)
    }
  }, [room])

  // Debug UI: Only show in development
  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

  return (
    <>
      {isDev && lastAgentMessage && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          zIndex: 99999,
          background: 'rgba(30,30,30,0.95)',
          color: '#fff',
          fontSize: 12,
          maxWidth: 400,
          maxHeight: 300,
          overflow: 'auto',
          border: '1px solid #333',
          borderRadius: 8,
          padding: 12,
          margin: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Agent Action Debug</div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
            {JSON.stringify(lastAgentMessage, null, 2)}
          </pre>
        </div>
      )}
    </>
  )
} 
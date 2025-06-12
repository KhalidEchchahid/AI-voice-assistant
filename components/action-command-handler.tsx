"use client"

import { useEffect } from "react"
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
        console.log("ActionCommandHandler: received data message", data)

        // Always forward the raw data so the helper can decide what to do with it
        const baseMessage = {
          action: "livekit_data_received",
          data: jsonString,
        }

        // If this looks like an execute_actions command, send the dedicated message as well
        if (data && data.type === "execute_actions" && Array.isArray(data.actions)) {
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
        console.error("ActionCommandHandler: failed to process data message", err)
      }
    }

    // Attach listener
    room.on("dataReceived", handleData)

    // Cleanup listener on unmount
    return () => {
      room.off("dataReceived", handleData)
    }
  }, [room])

  return null
} 
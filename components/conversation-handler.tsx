"use client"

import { useEffect, useCallback } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { DataPacket_Kind } from "livekit-client"

export type ConversationState = "idle" | "listening" | "processing" | "speaking" | "error"

interface ConversationHandlerProps {
  isConnected: boolean
  onStateChange: (state: ConversationState) => void
  onTranscriptReceived: (transcript: string) => void
  onResponseReceived: (response: string) => void
  onError: (error: string) => void
  onSendMessageReady: (sendMessageFn: (message: string) => void) => void
}

export default function ConversationHandler({
  isConnected,
  onStateChange,
  onTranscriptReceived,
  onResponseReceived,
  onError,
  onSendMessageReady,
}: ConversationHandlerProps) {
  const { room } = useLiveKit()

  // Create sendMessage function
  const sendMessage = useCallback(
    (message: string) => {
      if (!room || !isConnected) return

      try {
        const data = {
          type: "userMessage",
          text: message,
        }

        const encoder = new TextEncoder()
        const payload = encoder.encode(JSON.stringify(data))

        // Fix: Pass DataPacket_Kind as part of the options object
        room.localParticipant.publishData(payload, {
          reliable: true,
        })

        console.log("Sent message to agent:", message)
      } catch (err) {
        console.error("Error sending message to agent:", err)
        onError("Failed to send message to agent")
      }
    },
    [room, isConnected, onError],
  )

  // Provide the sendMessage function to the parent component
  useEffect(() => {
    onSendMessageReady(sendMessage)
  }, [sendMessage, onSendMessageReady])

  // Handle incoming data messages from the agent
  useEffect(() => {
    if (!room || !isConnected) return

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind, topic?: string) => {
      try {
        // Convert the binary data to a string
        const decoder = new TextDecoder()
        const dataString = decoder.decode(payload)

        // Parse the JSON data
        const data = JSON.parse(dataString)

        console.log("Received data from agent:", data)

        // Handle different message types
        if (data.type === "transcript") {
          onTranscriptReceived(data.text)
        } else if (data.type === "response") {
          onResponseReceived(data.text)
          onStateChange("speaking")
        } else if (data.type === "processing") {
          onStateChange("processing")
        } else if (data.type === "error") {
          onError(data.message || "Unknown error from agent")
          onStateChange("error")
        } else if (data.type === "done") {
          onStateChange("idle")
        }
      } catch (err) {
        console.error("Error processing data message:", err)
        onError("Failed to process message from agent")
      }
    }

    room.on("dataReceived", handleDataReceived)

    return () => {
      room.off("dataReceived", handleDataReceived)
    }
  }, [room, isConnected, onStateChange, onTranscriptReceived, onResponseReceived, onError])

  // This component doesn't render anything
  return null
}

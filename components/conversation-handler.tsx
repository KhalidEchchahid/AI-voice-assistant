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
      if (!room || !isConnected) {
        console.warn("ConversationHandler: Cannot send message - not connected")
        return
      }

      try {
        const data = {
          type: "userMessage",
          text: message,
          timestamp: new Date().toISOString(),
        }

        const encoder = new TextEncoder()
        const payload = encoder.encode(JSON.stringify(data))

        // Send message to agent
        room.localParticipant.publishData(payload, {
          reliable: true,
        })

        console.log("ConversationHandler: Sent message to agent:", message)
      } catch (err) {
        console.error("ConversationHandler: Error sending message to agent:", err)
        onError("Failed to send message to agent")
      }
    },
    [room, isConnected, onError],
  )

  // Provide the sendMessage function to the parent component
  useEffect(() => {
    onSendMessageReady(sendMessage)
  }, [sendMessage, onSendMessageReady])

  // Handle incoming data messages from the agent - CONVERSATION MESSAGES ONLY
  useEffect(() => {
    if (!room || !isConnected) return

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind, topic?: string) => {
      try {
        // Convert the binary data to a string
        const decoder = new TextDecoder('utf-8')
        const dataString = decoder.decode(payload)

        console.log("ConversationHandler: RAW data received:", dataString)

        // Parse the JSON data
        let data
        try {
          data = JSON.parse(dataString)
          console.log("ConversationHandler: PARSED data:", data)
        } catch (parseError) {
          // Not JSON, might be raw text - check if it looks like conversation content
          const trimmed = dataString.trim()
          if (trimmed && !trimmed.includes('execute_actions') && trimmed.length > 3) {
            console.log("ConversationHandler: Processing as raw text response:", trimmed)
            onResponseReceived(trimmed)
            onStateChange("speaking")
            return
          }
          console.log("ConversationHandler: Failed to parse as JSON and not valid text:", trimmed)
          return
        }

        // Skip action commands - let ActionCommandHandler handle them
        if (data.type === "execute_actions" || data.action === "execute_actions") {
          console.log("ConversationHandler: Ignoring action command")
          return
        }

        console.log("ConversationHandler: Processing conversation data:", data)

        // Handle LiveKit agent standard events
        if (data.type === "user_speech_committed") {
          const userText = data.text || data.transcript || ""
          if (userText.trim()) {
            console.log("ConversationHandler: User speech committed:", userText)
            onTranscriptReceived(userText.trim())
            onStateChange("processing")
          }
        } 
        else if (data.type === "agent_speech_committed") {
          const agentText = data.text || data.response || ""
          if (agentText.trim()) {
            console.log("ConversationHandler: Agent speech committed:", agentText)
            onResponseReceived(agentText.trim())
            onStateChange("speaking")
          }
        }
        // Handle agent state updates
        else if (data.type === "agent_state_changed") {
          const agentState = data.state
          console.log("ConversationHandler: Agent state changed to:", agentState)
          if (agentState === "listening") {
            onStateChange("listening")
          } else if (agentState === "thinking") {
            onStateChange("processing")
          } else if (agentState === "speaking") {
            onStateChange("speaking")
          } else if (agentState === "idle") {
            onStateChange("idle")
          }
        }
        // Handle conversation flow states
        else if (data.type === "transcript" || data.type === "user_transcript") {
          const userText = data.text || data.content || data.message || ""
          if (userText.trim()) {
            console.log("ConversationHandler: User transcript:", userText)
            onTranscriptReceived(userText.trim())
            onStateChange("processing")
          }
        } 
        else if (data.type === "response" || data.type === "agent_response" || data.type === "assistant_response") {
          const agentText = data.text || data.content || data.message || ""
          if (agentText.trim()) {
            console.log("ConversationHandler: Agent response:", agentText)
            onResponseReceived(agentText.trim())
            onStateChange("speaking")
          }
        }
        // Handle state-only messages
        else if (data.type === "state" || data.type === "conversation_state") {
          const state = data.state || data.status
          if (state) {
            console.log("ConversationHandler: State update:", state)
            onStateChange(state as ConversationState)
          }
        }
        // Handle processing/thinking states
        else if (data.type === "processing" || data.type === "thinking") {
          console.log("ConversationHandler: Agent is processing")
          onStateChange("processing")
        } 
        // Handle listening/ready states
        else if (data.type === "listening" || data.type === "ready") {
          console.log("ConversationHandler: Agent is listening")
          onStateChange("listening")
        } 
        // Handle completion states
        else if (data.type === "done" || data.type === "finished" || data.type === "idle" || data.type === "complete") {
          console.log("ConversationHandler: Agent finished")
          onStateChange("idle")
        }
        // Handle errors
        else if (data.type === "error" || data.type === "agent_error") {
          const errorMsg = data.message || data.error || "Unknown error from agent"
          console.log("ConversationHandler: Agent error:", errorMsg)
          onError(errorMsg)
          onStateChange("error")
        } 
        // Handle generic message formats - check if it contains conversation content
        else if (data.message || data.text || data.content) {
          const text = data.message || data.text || data.content
          if (typeof text === "string" && text.trim()) {
            console.log("ConversationHandler: Processing generic message:", text)
            // Check if this looks like a user input or agent response
            if (data.role === "user" || data.speaker === "user") {
              console.log("ConversationHandler: User message:", text)
              onTranscriptReceived(text.trim())
              onStateChange("processing")
            } else if (data.role === "assistant" || data.speaker === "assistant" || data.role === "agent") {
              console.log("ConversationHandler: Agent message:", text)
              onResponseReceived(text.trim())
              onStateChange("speaking")
            } else {
              // Assume it's an agent response if no role specified
              console.log("ConversationHandler: Assuming agent response:", text)
              onResponseReceived(text.trim())
              onStateChange("speaking")
            }
          }
        }
        // Handle objects with nested conversation content
        else if (typeof data === "object" && data !== null) {
          // Try to find conversation content in nested objects
          const possibleText = data.transcript || data.response || data.output
          if (possibleText && typeof possibleText === "string" && possibleText.trim()) {
            console.log("ConversationHandler: Found nested content:", possibleText)
            onResponseReceived(possibleText.trim())
            onStateChange("speaking")
          } else {
            // Log the full data structure for debugging
            console.log("ConversationHandler: No recognizable conversation content in object:", JSON.stringify(data, null, 2))
          }
        }
        // Log unknown message types for debugging
        else {
          console.log("ConversationHandler: Unknown message format - no recognizable conversation content:", JSON.stringify(data, null, 2))
        }
      } catch (err) {
        console.error("ConversationHandler: Error processing data message:", err)
        onError("Failed to process message from agent")
      }
    }

    // Listen for data messages
    room.on("dataReceived", handleDataReceived)

    console.log("ConversationHandler: Initialized - listening for conversation messages")

    return () => {
      room.off("dataReceived", handleDataReceived)
    }
  }, [room, isConnected, onStateChange, onTranscriptReceived, onResponseReceived, onError])

  // This component doesn't render anything
  return null
}

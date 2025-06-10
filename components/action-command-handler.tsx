"use client"

import { useEffect, useCallback, useState } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { DataPacket_Kind } from "livekit-client"

interface ActionCommandHandlerProps {
  isConnected: boolean
  onActionReceived?: (actionData: any) => void
  onActionExecuting?: (actionCount: number) => void
  onActionComplete?: () => void
  onError?: (error: string) => void
}

export default function ActionCommandHandler({
  isConnected,
  onActionReceived,
  onActionExecuting,
  onActionComplete,
  onError,
}: ActionCommandHandlerProps) {
  const { room } = useLiveKit()
  const [isExecutingActions, setIsExecutingActions] = useState(false)

  // Forward action commands to parent window (helper script)
  const forwardActionCommandsToHelper = useCallback((actionData: any) => {
    try {
      // Create message for helper script
      const message = {
        action: "execute_actions",
        payload: actionData.actions,
        type: "execute_actions",
        actions: actionData.actions,
        metadata: {
          website_id: actionData.website_id,
          user_intent: actionData.user_intent,
          timestamp: new Date().toISOString(),
          source: "voice_assistant_backend"
        }
      }

      console.log("Voice Widget: Sending action commands to helper script:", message)

      // Send to parent window where assistant-loader.js is running
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*')
        console.log("Voice Widget: Action commands sent to parent window successfully")
      } else {
        console.warn("Voice Widget: No parent window available to send action commands")
      }

    } catch (error) {
      console.error("Voice Widget: Error forwarding action commands:", error)
      onError?.("Failed to forward action commands to helper script")
    }
  }, [onError])

  // Show visual feedback for action execution
  const showActionExecutionFeedback = useCallback((actionData: any) => {
    try {
      const actionCount = actionData.actions ? actionData.actions.length : 0
      const userIntent = actionData.user_intent || "action"
      
      console.log(`Voice Widget: Executing ${actionCount} actions for: ${userIntent}`)
      
      setIsExecutingActions(true)
      onActionExecuting?.(actionCount)
      
      // Add a temporary visual indicator
      if (document.body) {
        document.body.classList.add('executing-actions')
        setTimeout(() => {
          document.body.classList.remove('executing-actions')
          setIsExecutingActions(false)
          onActionComplete?.()
        }, 2000)
      }

      // Optional: Display action count in widget
      const statusElement = document.querySelector('.action-status')
      if (statusElement) {
        statusElement.textContent = `Executing ${actionCount} action${actionCount !== 1 ? 's' : ''}...`
        setTimeout(() => {
          statusElement.textContent = ''
        }, 3000)
      }

    } catch (error) {
      console.error("Voice Widget: Error showing action feedback:", error)
      setIsExecutingActions(false)
    }
  }, [onActionExecuting, onActionComplete])

  // Handle incoming data messages from the backend agent
  useEffect(() => {
    if (!room || !isConnected) return

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind, topic?: string) => {
      try {
        console.log("Voice Widget: Received data message from backend:", {
          participant: participant?.identity,
          dataSize: payload.length,
          kind: kind,
          topic: topic
        })

        // Convert the binary data to a string
        const decoder = new TextDecoder('utf-8')
        const dataString = decoder.decode(payload)

        console.log("Voice Widget: Decoded data string:", dataString)

        // Parse the JSON data
        let actionData
        try {
          actionData = JSON.parse(dataString)
        } catch (parseError) {
          console.warn("Voice Widget: Failed to parse data as JSON:", parseError)
          return
        }

        console.log("Voice Widget: Parsed action data:", actionData)

        // Check if this is an action command payload
        if (actionData && actionData.type === "execute_actions") {
          console.log("Voice Widget: Received action commands, forwarding to helper script")
          
          onActionReceived?.(actionData)
          
          // Forward action commands to parent window (where assistant-loader.js is running)
          forwardActionCommandsToHelper(actionData)
          
          // Show visual feedback for action execution
          showActionExecutionFeedback(actionData)
          
        } else {
          console.log("Voice Widget: Data message is not an action command, ignoring")
        }

      } catch (error) {
        console.error("Voice Widget: Error processing data message:", error)
        onError?.("Failed to process action command from backend")
      }
    }

    // Set up the data message listener
    room.on("dataReceived", handleDataReceived)

    console.log("Voice Widget: Action command bridge initialized - listening for backend data messages")

    return () => {
      room.off("dataReceived", handleDataReceived)
    }
  }, [room, isConnected, forwardActionCommandsToHelper, showActionExecutionFeedback, onActionReceived, onError])

  // Add CSS for visual feedback
  useEffect(() => {
    // Add CSS to head if it doesn't exist
    if (!document.getElementById('action-feedback-styles')) {
      const styleElement = document.createElement('style')
      styleElement.id = 'action-feedback-styles'
      styleElement.innerHTML = `
        body.executing-actions {
          position: relative;
        }
        
        body.executing-actions::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4776E6, #8E54E9);
          animation: pulse 1.5s ease-in-out infinite;
          z-index: 10000;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .action-status {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          z-index: 10001;
          transition: opacity 0.3s ease;
        }
      `
      document.head.appendChild(styleElement)
    }
  }, [])

  // This component doesn't render anything visible
  return (
    <>
      {isExecutingActions && (
        <div className="action-status">
          Executing actions...
        </div>
      )}
    </>
  )
} 
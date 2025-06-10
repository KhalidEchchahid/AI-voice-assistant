"use client"

import { useState, useEffect, useCallback } from "react"
import MicrophoneButton from "@/components/microphone-button"
import StatusDisplay from "@/components/status-display"
import VisualFeedback from "@/components/visual-feedback"
import TranscriptArea from "@/components/transcript-area"
import SettingsButton from "@/components/settings-button"
import { useMobile } from "@/hooks/use-mobile"
import { Camera } from 'lucide-react'
import { cn } from "@/lib/utils"
import VisionProcessingAnimation from "@/components/vision-processing-animation"
import CameraPermissionDialog from "@/components/camera-permission-dialog"
import { Button } from "@/components/ui/button"
import AgentConnection from "@/components/agent-connection"
import SpeechRecognition from "@/components/speech-recognition"
import TextToSpeech from "@/components/text-to-speech"
import LiveKitAudioProcessor from "@/components/livekit-audio-processor"
import ConversationHandler, { type ConversationState } from "@/components/conversation-handler"
import ActionCommandHandler from "@/components/action-command-handler"
import type { Message } from "@/components/transcript-area"

export type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "connecting"
  | "vision_processing"

export default function VoiceAssistant() {
  const [state, setState] = useState<AssistantState>("idle")
  const [transcript, setTranscript] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showTranscript, setShowTranscript] = useState<boolean>(false)
  const isMobile = useMobile()
  const [visionActive, setVisionActive] = useState<boolean>(false)
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null)
  const [agentConnected, setAgentConnected] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [currentResponse, setCurrentResponse] = useState<string>("")
  const [interimTranscript, setInterimTranscript] = useState<string>("")
  const [finalTranscript, setFinalTranscript] = useState<string>("")
  const [sendMessage, setSendMessage] = useState<((message: string) => void) | null>(null)
  const [isExecutingActions, setIsExecutingActions] = useState<boolean>(false)

  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (state === "idle") {
      setState("listening")
      setIsListening(true)
    } else if (state === "listening") {
      setState("idle")
      setIsListening(false)
    } else if (state === "speaking") {
      setState("idle")
      setIsSpeaking(false)
    }
  }

  // Handle camera toggle
  const toggleCamera = () => {
    if (cameraPermissionGranted === null) {
      // First time, show permission dialog
      setShowPermissionDialog(true)
    } else if (cameraPermissionGranted) {
      // Toggle camera if permission is already granted
      setCameraActive(!cameraActive)
      if (!cameraActive) {
        setVisionActive(true)
      }
    } else {
      // Permission was previously denied, show dialog again
      setShowPermissionDialog(true)
    }
  }

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraPermissionGranted(true)
      setCameraActive(true)
      setVisionActive(true)
      setShowPermissionDialog(false)
    } catch (err) {
      console.error("Camera permission denied:", err)
      setCameraPermissionGranted(false)
      setShowPermissionDialog(false)
    }
  }

  // Handle vision processing
  const simulateVisionProcessing = () => {
    if (!cameraActive) {
      toggleCamera()
      return
    }

    setVisionActive(true)
    setState("vision_processing")
  }

  // Toggle transcript visibility
  const toggleTranscript = () => {
    setShowTranscript((prev) => !prev)
  }

  // Handle agent connection change
  const handleAgentConnectionChange = (connected: boolean) => {
    // Only add a message if the connection state actually changed
    if (connected !== agentConnected) {
      setAgentConnected(connected)

      if (connected) {
        const connectMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I've successfully connected to your agent. I can now collaborate with it to provide better assistance.",
        }
        setMessages((prev) => [...prev, connectMessage])
      }
    }
  }

  // Handle speech recognition transcript
  const handleTranscript = useCallback((text: string) => {
    setInterimTranscript(text)
  }, [])

  // Handle final speech recognition transcript
  const handleFinalTranscript = useCallback(
    (text: string) => {
      setFinalTranscript(text)

      // Add user message to conversation
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      }

      setMessages((prev) => [...prev, userMessage])
      setInterimTranscript("")
      setState("processing")
      setIsListening(false)

      // Send message to agent if connected
      if (sendMessage && agentConnected) {
        sendMessage(text)
      }
    },
    [agentConnected, sendMessage],
  )

  // Handle speech recognition error
  const handleSpeechError = useCallback((error: string) => {
    console.error("Speech recognition error:", error)
    setState("error")
    setIsListening(false)
  }, [])

  // Handle text-to-speech start
  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true)
  }, [])

  // Handle text-to-speech end
  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false)
    setState("idle")
  }, [])

  // Handle text-to-speech error
  const handleSpeechSynthesisError = useCallback((error: string) => {
    console.error("Speech synthesis error:", error)
    setState("error")
    setIsSpeaking(false)
  }, [])

  // Handle conversation state change
  const handleConversationStateChange = useCallback((conversationState: ConversationState) => {
    setState(conversationState as AssistantState)

    if (conversationState === "listening") {
      setIsListening(true)
    } else if (conversationState === "speaking") {
      setIsListening(false)
    } else if (conversationState === "idle") {
      setIsListening(false)
      setIsSpeaking(false)
    }
  }, [])

  // Handle transcript from agent
  const handleTranscriptFromAgent = useCallback((text: string) => {
    setInterimTranscript(text)
  }, [])

  // Handle response from agent
  const handleResponseFromAgent = useCallback((text: string) => {
    setCurrentResponse(text)

    // Add assistant message to conversation
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: text,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsSpeaking(true)
  }, [])

  // Handle error from agent
  const handleErrorFromAgent = useCallback((error: string) => {
    console.error("Agent error:", error)
    setState("error")
  }, [])

  // Handle receiving the sendMessage function from ConversationHandler
  const handleSendMessageReady = useCallback((sendMessageFn: (message: string) => void) => {
    setSendMessage(() => sendMessageFn)
  }, [])

  // Handle action command received
  const handleActionReceived = useCallback((actionData: any) => {
    console.log("Voice Assistant: Received action commands:", actionData)
  }, [])

  // Handle action execution start
  const handleActionExecuting = useCallback((actionCount: number) => {
    console.log(`Voice Assistant: Starting execution of ${actionCount} actions`)
    setIsExecutingActions(true)
  }, [])

  // Handle action execution complete
  const handleActionComplete = useCallback(() => {
    console.log("Voice Assistant: Action execution completed")
    setIsExecutingActions(false)
  }, [])

  // Handle action execution error
  const handleActionError = useCallback((error: string) => {
    console.error("Voice Assistant: Action execution error:", error)
    setIsExecutingActions(false)
  }, [])

  // Simulate connection on initial load
  useEffect(() => {
    setState("connecting")
    setTimeout(() => {
      setState("idle")
    }, 1500)
  }, [])

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you today?",
      }
      setMessages([welcomeMessage])
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <SettingsButton />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
        {/* Agent connection */}
        <div className="mb-4">
          <AgentConnection onConnectionChange={handleAgentConnectionChange} />
        </div>

        {/* Transcript area (optional/collapsible) */}
        {showTranscript && (
          <div className="mb-4 flex-1 h-[300px] overflow-hidden">
            <TranscriptArea messages={messages} />
          </div>
        )}

        {/* Status and visualization area */}
        <div className={`flex flex-col items-center justify-center ${showTranscript ? "" : "flex-1"}`}>
          <StatusDisplay state={state} transcript={interimTranscript || transcript} visionActive={visionActive} />
          {state === "speaking" && <VisualFeedback />}
          {state === "vision_processing" && <VisionProcessingAnimation active={true} />}
        </div>

        {/* Bottom controls */}
        <div className="mt-4 flex flex-col items-center">
          <div className="flex items-center space-x-4">
            <MicrophoneButton state={state} onClick={handleMicrophoneClick} />

            <Button
              variant="outline"
              size="icon"
              onClick={simulateVisionProcessing}
              disabled={state !== "idle" && state !== "vision_processing"}
              className={cn(
                "h-16 w-16 rounded-full border-2 transition-all duration-300",
                cameraActive
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500"
                  : "border-gray-300 dark:border-gray-700 hover:border-indigo-500 hover:text-indigo-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Camera className="h-6 w-6" />
            </Button>
          </div>

          <button
            onClick={toggleTranscript}
            className="mt-4 text-xs text-gray-500 dark:text-gray-400 hover:underline focus:outline-none"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
        </div>
      </div>

      {/* Camera permission dialog */}
      <CameraPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onRequestPermission={requestCameraPermission}
      />

      {/* Speech recognition component */}
      <SpeechRecognition
        isListening={isListening}
        onTranscript={handleTranscript}
        onFinalTranscript={handleFinalTranscript}
        onError={handleSpeechError}
      />

      {/* Text-to-speech component */}
      <TextToSpeech
        text={currentResponse}
        speak={isSpeaking}
        onStart={handleSpeechStart}
        onEnd={handleSpeechEnd}
        onError={handleSpeechSynthesisError}
      />

      {/* LiveKit audio processor */}
      <LiveKitAudioProcessor isProcessing={state === "speaking" || state === "processing"} />

      {/* Conversation handler */}
      {agentConnected && (
        <ConversationHandler
          isConnected={agentConnected}
          onStateChange={handleConversationStateChange}
          onTranscriptReceived={handleTranscriptFromAgent}
          onResponseReceived={handleResponseFromAgent}
          onError={handleErrorFromAgent}
          onSendMessageReady={handleSendMessageReady}
        />
      )}

      {/* Action command handler */}
      {agentConnected && (
        <ActionCommandHandler
          isConnected={agentConnected}
          onActionReceived={handleActionReceived}
          onActionExecuting={handleActionExecuting}
          onActionComplete={handleActionComplete}
          onError={handleActionError}
        />
      )}
    </div>
  )
}

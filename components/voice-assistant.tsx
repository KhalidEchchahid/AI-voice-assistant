"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useVoiceAssistant,
  useLocalParticipant,
  useTrackTranscription,
  useChat,
  useConnectionState,
  useTracks,
  VideoTrack,
} from "@livekit/components-react"
import { ConnectionState, Track, type TranscriptionSegment, LocalParticipant, type Participant } from "livekit-client"
import StatusDisplay from "@/components/status-display"
import TranscriptArea from "@/components/transcript-area"
import { Phone, PhoneOff, Loader2, Camera, CameraOff, AlertCircle, Sparkles } from "lucide-react"
import type { Message } from "@/components/transcript-area"
import ActionCommandHandler from "@/components/action-command-handler"

// Helper function to convert transcription segment to chat message (playground style)
function segmentToChatMessage(
  segment: TranscriptionSegment,
  existingMessage: Message | undefined,
  participant: Participant,
): Message {
  const isLocal = participant instanceof LocalParticipant

  return {
    id: `transcript-${segment.id}`,
    role: isLocal ? "user" : "assistant",
    content: segment.final ? segment.text : `${segment.text} ...`, // Show real-time with ...
    timestamp: existingMessage?.timestamp ?? Date.now(), // Preserve original timestamp
  }
}

// Inner component that uses LiveKit hooks
function VoiceAssistantInner({
  onMessagesUpdate,
  isCameraEnabled,
  onCameraToggle,
  onError,
  onConnectionStateChange,
}: {
  onMessagesUpdate?: (messages: Message[]) => void
  isCameraEnabled?: boolean
  onCameraToggle?: () => void
  onError?: (error: string) => void
  onConnectionStateChange?: (state: ConnectionState) => void
}) {
  const connectionState = useConnectionState()
  const localParticipant = useLocalParticipant()
  const voiceAssistant = useVoiceAssistant()
  const [showTranscript, setShowTranscript] = useState(true)

  // Get all tracks
  const tracks = useTracks()

  // Find local camera track
  const localCameraTrack = tracks.find(
    (trackRef) => trackRef.source === Track.Source.Camera && trackRef.participant instanceof LocalParticipant,
  )

  // Get transcription segments from both local and agent tracks (exactly like playground)
  const agentMessages = useTrackTranscription(voiceAssistant.audioTrack || undefined)
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  })

  const { chatMessages } = useChat()

  // Store transcripts using Map like in playground for proper real-time updates
  const [transcripts, setTranscripts] = useState<Map<string, Message>>(new Map())
  const [messages, setMessages] = useState<Message[]>([])

  // Notify parent of connection state changes
  useEffect(() => {
    onConnectionStateChange?.(connectionState)
  }, [connectionState, onConnectionStateChange])

  // Handle camera toggling
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant.localParticipant) {
      localParticipant.localParticipant.setCameraEnabled(isCameraEnabled || false)
    }
  }, [isCameraEnabled, connectionState, localParticipant])

  // Process transcripts EXACTLY like the playground
  useEffect(() => {
    // Process agent transcripts (AI responses)
    if (voiceAssistant.audioTrack) {
      agentMessages.segments.forEach((s) =>
        transcripts.set(s.id, segmentToChatMessage(s, transcripts.get(s.id), voiceAssistant.audioTrack!.participant)),
      )
    }

    // Process local transcripts (user speech) - this is the key part!
    localMessages.segments.forEach((s) =>
      transcripts.set(s.id, segmentToChatMessage(s, transcripts.get(s.id), localParticipant.localParticipant)),
    )

    // Combine with chat messages (fallback)
    const allMessages = Array.from(transcripts.values())

    for (const msg of chatMessages) {
      const isAgent = voiceAssistant.audioTrack
        ? msg.from?.identity === voiceAssistant.audioTrack.participant?.identity
        : msg.from?.identity !== localParticipant.localParticipant.identity
      const isSelf = msg.from?.identity === localParticipant.localParticipant.identity

      allMessages.push({
        id: `chat-${msg.timestamp}-${Math.random()}`,
        role: isSelf ? "user" : "assistant",
        content: msg.message,
        timestamp: msg.timestamp,
      })
    }

    // Sort by timestamp for proper chronological order
    allMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

    setMessages(allMessages)

    // Update parent component with messages for persistence
    onMessagesUpdate?.(allMessages)

    console.log("Playground-style transcript processing:", {
      agentSegments: agentMessages.segments.length,
      localSegments: localMessages.segments.length,
      totalMessages: allMessages.length,
    })
  }, [
    transcripts,
    chatMessages,
    localParticipant.localParticipant,
    voiceAssistant.audioTrack?.participant,
    agentMessages.segments,
    localMessages.segments,
    voiceAssistant.audioTrack,
  ])

  // Log transcript activity
  useEffect(() => {
    console.log("VoiceAssistant: Agent messages:", agentMessages.segments)
  }, [agentMessages.segments])

  useEffect(() => {
    console.log("VoiceAssistant: Local messages:", localMessages.segments)
  }, [localMessages.segments])

  useEffect(() => {
    console.log("VoiceAssistant: Chat messages:", chatMessages)
  }, [chatMessages])

  // Determine current state
  const currentState = useMemo(() => {
    if (connectionState === ConnectionState.Connecting) return "connecting"
    if (connectionState !== ConnectionState.Connected) return "idle"

    if (voiceAssistant.state === "listening") return "listening"
    if (voiceAssistant.state === "thinking") return "processing"
    if (voiceAssistant.state === "speaking") return "speaking"

    return "idle"
  }, [connectionState, voiceAssistant.state])

  // Debug agent connection issues
  useEffect(() => {
    console.log("Voice Assistant Debug:", {
      connectionState,
      agentConnected: voiceAssistant.agent !== undefined,
      audioTrackExists: voiceAssistant.audioTrack !== undefined,
      voiceAssistantState: voiceAssistant.state,
      currentState,
    })
  }, [connectionState, voiceAssistant.agent, voiceAssistant.audioTrack, voiceAssistant.state, currentState])

  const isConnected = connectionState === ConnectionState.Connected
  const isAgentConnected = voiceAssistant.agent !== undefined && voiceAssistant.audioTrack !== undefined
  const isCameraActive = localCameraTrack !== undefined

  return (
    <>
      {/* Enhanced Background Video */}
      {isCameraActive && localCameraTrack && (
        <div className="absolute inset-0 z-0">
          <VideoTrack trackRef={localCameraTrack} className="absolute inset-0 w-full h-full object-cover" />
          {/* Enhanced overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px]"></div>
        </div>
      )}

      {/* Chat Area - Takes most of the space */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <TranscriptArea
          messages={messages}
          showTranscript={showTranscript}
          onToggleView={() => setShowTranscript(!showTranscript)}
        />
      </div>

      {/* Minimal Status Area - Only shows when processing/speaking */}
      {(currentState === "processing" || currentState === "speaking") && (
        <div className="p-3 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl relative z-10 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5" />

          <div className="flex flex-col items-center space-y-2 relative z-10">
            {/* Status Display - Only for processing/speaking */}
            <StatusDisplay state={currentState as any} transcript="" visionActive={false} />
          </div>
        </div>
      )}
    </>
  )
}

// Main Voice Assistant wrapper component
export default function VoiceAssistant() {
  const [wsUrl, setWsUrl] = useState<string>("")
  const [token, setToken] = useState<string>("")
  const [shouldConnect, setShouldConnect] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [hasEverConnected, setHasEverConnected] = useState<boolean>(false)
  const [persistedMessages, setPersistedMessages] = useState<Message[]>([])
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(true)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0)

  // Ref to track if we're currently connecting to prevent duplicate requests
  const connectingRef = useRef<boolean>(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Clear any pending reconnection attempts
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
  }, [])

  // Enhanced token generation with retry logic
  const generateToken = useCallback(
    async (isRetry = false): Promise<{ token: string; wsUrl: string } | null> => {
      if (connectingRef.current && !isRetry) {
        console.log("🔄 Already connecting, skipping duplicate request")
        return null
      }

      try {
        connectingRef.current = true
        setIsLoading(true)
        setError(null)

        console.log("🔄 Generating LiveKit token with VISION support...", {
          isRetry,
          retryCount,
          timestamp: Date.now(),
        })

        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room: `voice-assistant-room-${Date.now()}`, // Unique room for each session
            identity: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: "Voice Assistant User",
            dispatchMode: "auto", // Use auto dispatch mode
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const responseData = await response.json()
        const { token: newToken, wsUrl: newWsUrl } = responseData

        console.log("✅ Token generated successfully with VISION capabilities", {
          hasToken: !!newToken,
          hasWsUrl: !!newWsUrl,
          wsUrl: newWsUrl,
          tokenLength: newToken?.length || 0,
          timestamp: Date.now(),
          fullResponse: responseData,
        })

        setRetryCount(0) // Reset retry count on success
        return { token: newToken, wsUrl: newWsUrl }
      } catch (err) {
        console.error("❌ Failed to generate token:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to connect"

        // Check for specific error types
        if (errorMessage.includes("Invalid key") || errorMessage.includes("invalid API key")) {
          setError("Invalid LiveKit credentials. Check your environment variables.")
          setRetryCount(0) // Don't retry on auth errors
          return null
        }

        setError(errorMessage)
        throw err
      } finally {
        connectingRef.current = false
        setIsLoading(false)
      }
    },
    [retryCount],
  )

  // Handle connection - simplified without retry loop
  const handleConnect = useCallback(async () => {
    const now = Date.now()

    // Prevent rapid successive connection attempts
    if (now - lastConnectionAttempt < 2000) {
      console.log("🔄 Rate limiting connection attempts")
      return
    }

    setLastConnectionAttempt(now)
    clearReconnectTimeout()

    try {
      const result = await generateToken(false)
      if (!result) return

      const { token: newToken, wsUrl: newWsUrl } = result

      // Clear any existing connection state
      if (shouldConnect) {
        setShouldConnect(false)
        await new Promise((resolve) => setTimeout(resolve, 500)) // Brief pause
      }

      setWsUrl(newWsUrl)
      setToken(newToken)
      setShouldConnect(true)

      console.log("🔄 Initiating connection...", { wsUrl: newWsUrl, hasToken: !!newToken })
    } catch (err) {
      console.error("❌ Connection failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to connect"
      setError(errorMessage)
      setShouldConnect(false)
      // REMOVED RETRY LOGIC - User must manually retry
    }
  }, [generateToken, shouldConnect, lastConnectionAttempt, clearReconnectTimeout])

  // Handle disconnect with proper cleanup
  const handleDisconnect = useCallback(async () => {
    console.log("🔄 Disconnecting...")
    clearReconnectTimeout()
    setShouldConnect(false)
    setError(null)
    setRetryCount(0)

    // Allow some time for graceful disconnect
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Clear tokens to force regeneration on reconnect
    setWsUrl("")
    setToken("")
    connectingRef.current = false

    console.log("✅ Disconnected and cleaned up")
  }, [clearReconnectTimeout])

  // Handle connection state changes
  const handleConnectionStateChange = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state)
      console.log("🔄 Connection state changed:", state)

      switch (state) {
        case ConnectionState.Connected:
          setHasEverConnected(true)
          setError(null)
          setRetryCount(0)
          setIsLoading(false)
          clearReconnectTimeout()
          break

        case ConnectionState.Disconnected:
          // REMOVED AUTO-RETRY LOOP - Let user manually retry
          console.log("🔄 Disconnected - manual reconnection required")
          break

        case ConnectionState.Reconnecting:
          setError(null)
          break
      }
    },
    [clearReconnectTimeout],
  )

  // Handle errors from the inner component
  const handleError = useCallback((errorMessage: string) => {
    console.error("🚨 Voice Assistant Error:", errorMessage)
    setError(errorMessage)
  }, [])

  // Toggle camera function
  const toggleCamera = useCallback(() => {
    setIsCameraEnabled((prev) => !prev)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout()
      connectingRef.current = false
    }
  }, [clearReconnectTimeout])

  // Show initial connection screen only if never connected
  if (!hasEverConnected && (!shouldConnect || !wsUrl || !token)) {
    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-background border border-border/50 rounded-xl overflow-hidden relative backdrop-blur-sm">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,197,94,0.1),transparent_50%)]" />

        {/* Camera Preview (if enabled) */}
        {isCameraEnabled && (
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover rounded-xl"
              ref={(video) => {
                if (video && isCameraEnabled) {
                  navigator.mediaDevices
                    .getUserMedia({ video: true })
                    .then((stream) => {
                      video.srcObject = stream
                    })
                    .catch(console.error)
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px] rounded-xl"></div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center relative z-10 p-8">
          <div className="text-center max-w-md">
            {/* Enhanced logo/icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/25 relative">
                <Sparkles className="w-12 h-12 text-white" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
              </div>
              {/* Floating particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-violet-400/40 rounded-full animate-float"
                    style={{
                      left: `${30 + i * 20}%`,
                      top: `${20 + i * 15}%`,
                      animationDelay: `${i * 0.7}s`,
                      animationDuration: `${2 + i * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              AI Voice Assistant
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Connect to start your conversation with the future of AI communication
            </p>

            <div className="flex flex-col items-center space-y-4">
              {/* Enhanced connect button */}
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 transition-all duration-500 shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-black/10" />
                <div className="relative z-10 flex items-center justify-center h-full">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <Phone className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
                  )}
                </div>
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-0 group-hover:opacity-100" />
              </button>

              {/* Vision Capabilities Info */}
              <div className="text-center space-y-2 max-w-sm">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span>Voice + Vision AI</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80">
                  I can see through your camera and help with real-world tasks
                </p>
              </div>

              {error && (
                <div className="text-xs text-red-400 text-center max-w-xs p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Connection Error</span>
                  </div>
                  <div className="text-center leading-relaxed">{error}</div>
                  {retryCount > 0 && <div className="text-red-300 mt-2 text-xs">Retry {retryCount}/3...</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repositioned Floating Buttons - Bottom Right */}
        <div className="absolute z-30 bottom-4 right-4 flex space-x-2">
          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`group relative w-12 h-12 rounded-full transition-all duration-500 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isCameraEnabled
                ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-blue-500/25 hover:shadow-blue-500/40"
                : "bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-gray-500/25 hover:shadow-gray-500/40"
            }`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
            <div className="relative z-10 flex items-center justify-center h-full">
              {isCameraEnabled ? (
                <Camera className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <CameraOff className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
          </button>
        </div>
      </div>
    )
  }

  // If we've connected before but are currently disconnected, show the chat interface with history
  if (hasEverConnected && (!shouldConnect || !wsUrl || !token)) {
    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-background border border-border/50 rounded-xl overflow-hidden relative backdrop-blur-sm">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />

        {/* Camera Preview (if enabled) */}
        {isCameraEnabled && (
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover rounded-xl"
              ref={(video) => {
                if (video && isCameraEnabled) {
                  navigator.mediaDevices
                    .getUserMedia({ video: true })
                    .then((stream) => {
                      video.srcObject = stream
                    })
                    .catch(console.error)
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px] rounded-xl"></div>
          </div>
        )}

        {/* Chat Area with preserved messages */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          <TranscriptArea messages={persistedMessages} showTranscript={true} onToggleView={() => {}} />
        </div>

        {/* Repositioned Floating Action Buttons - Bottom Right */}
        <div className="absolute z-30 bottom-4 right-4 flex space-x-2">
          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`group relative w-12 h-12 rounded-full transition-all duration-500 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isCameraEnabled
                ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-blue-500/25 hover:shadow-blue-500/40"
                : "bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-gray-500/25 hover:shadow-gray-500/40"
            }`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
            <div className="relative z-10 flex items-center justify-center h-full">
              {isCameraEnabled ? (
                <Camera className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <CameraOff className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
          </button>

          {/* Call Button */}
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 transition-all duration-500 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
            <div className="relative z-10 flex items-center justify-center h-full">
              {isLoading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Phone className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        {error && (
          <div className="absolute bottom-20 left-4 max-w-xs z-40">
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="font-medium">Error</span>
              </div>
              <div className="leading-relaxed">{error}</div>
              {retryCount > 0 && <div className="text-red-300 mt-2">Retrying... ({retryCount}/3)</div>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <LiveKitRoom
      className="w-full h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-background border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm"
      serverUrl={wsUrl}
      token={token}
      connect={shouldConnect}
      audio={true}
      video={false}
      onError={(e) => {
        const errorMessage = e.message || "Connection error"
        console.error("🚨 LiveKit Connection Error Details:", {
          message: e.message,
          error: e,
          wsUrl,
          tokenPreview: token ? token.substring(0, 50) + "..." : "No token",
          tokenLength: token?.length || 0,
          timestamp: new Date().toISOString(),
        })

        // Specific error handling
        if (errorMessage.includes("invalid API key") || errorMessage.includes("Invalid key")) {
          setError(
            "Invalid LiveKit credentials. Please check your LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.",
          )
        } else if (errorMessage.includes("Failed to connect") || errorMessage.includes("network")) {
          setError("Network connection failed. Please check your LIVEKIT_URL and internet connection.")
        } else {
          setError(errorMessage)
        }

        handleError(errorMessage)
      }}
      onConnected={() => {
        console.log("LiveKit: Successfully connected to room")
        setError(null)
        setHasEverConnected(true)
        setIsLoading(false)
      }}
      onDisconnected={(reason) => {
        console.log("LiveKit: Disconnected from room", reason)
        setIsLoading(false)
        setShouldConnect(false)
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Action command bridge */}
        <ActionCommandHandler />
        <VoiceAssistantInner
          onMessagesUpdate={setPersistedMessages}
          isCameraEnabled={isCameraEnabled}
          onCameraToggle={toggleCamera}
          onError={handleError}
          onConnectionStateChange={handleConnectionStateChange}
        />

        {/* Repositioned Floating Action Buttons - Bottom Right */}
        <div className="absolute z-30 bottom-4 right-4 flex space-x-2">
          {/* Camera Button - only show when connected */}
          {shouldConnect && connectionState === ConnectionState.Connected && (
            <button
              onClick={toggleCamera}
              className={`group relative w-12 h-12 rounded-full transition-all duration-500 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                isCameraEnabled
                  ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-blue-500/25 hover:shadow-blue-500/40"
                  : "bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-gray-500/25 hover:shadow-gray-500/40"
              }`}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
              <div className="relative z-10 flex items-center justify-center h-full">
                {isCameraEnabled ? (
                  <Camera className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <CameraOff className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
                )}
              </div>
            </button>
          )}

          {/* Call Button */}
          <button
            onClick={shouldConnect ? handleDisconnect : handleConnect}
            disabled={isLoading}
            className={`group relative w-14 h-14 rounded-full transition-all duration-500 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 ${
              shouldConnect
                ? "bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 shadow-red-500/25 hover:shadow-red-500/40"
                : "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-emerald-500/25 hover:shadow-emerald-500/40"
            } ${isLoading ? "from-gray-600 to-gray-700 shadow-gray-500/25" : ""}`}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse group-hover:animate-none" />
            <div className="relative z-10 flex items-center justify-center h-full">
              {isLoading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : shouldConnect ? (
                <PhoneOff className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <Phone className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        {/* Enhanced Error Display */}
        {error && shouldConnect && (
          <div className="absolute bottom-20 left-4 max-w-xs z-40">
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg backdrop-blur-sm shadow-xl">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="font-medium">Connection Error</span>
              </div>
              <div className="leading-relaxed">{error}</div>
              {retryCount > 0 && <div className="text-red-300 mt-2">Retrying... ({retryCount}/3)</div>}
            </div>
          </div>
        )}
      </div>

      <RoomAudioRenderer />
      <StartAudio label="Click to enable audio playback" />
    </LiveKitRoom>
  )
}

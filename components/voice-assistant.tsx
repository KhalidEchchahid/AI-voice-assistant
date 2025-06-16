"use client"

import { useState, useEffect, useMemo } from "react"
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
  VideoTrack
} from "@livekit/components-react"
import { 
  ConnectionState, 
  Track, 
  TranscriptionSegment, 
  LocalParticipant,
  Participant,
  createLocalAudioTrack
} from "livekit-client"
import StatusDisplay from "@/components/status-display"
import VisualFeedback from "@/components/visual-feedback"
import TranscriptArea from "@/components/transcript-area"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Loader2, Mic, MicOff, Camera, CameraOff } from "lucide-react"
import type { Message } from "@/components/transcript-area"
import ActionCommandHandler from "@/components/action-command-handler"

// Helper function to convert transcription segment to chat message (playground style)
function segmentToChatMessage(
  segment: TranscriptionSegment,
  existingMessage: Message | undefined,
  participant: Participant
): Message {
  const isLocal = participant instanceof LocalParticipant
  
  return {
    id: `transcript-${segment.id}`,
    role: isLocal ? "user" : "assistant",
    content: segment.final ? segment.text : `${segment.text} ...`, // Show real-time with ...
    timestamp: existingMessage?.timestamp ?? Date.now() // Preserve original timestamp
  }
}

// Inner component that uses LiveKit hooks
function VoiceAssistantInner({ 
  onMessagesUpdate, 
  isCameraEnabled, 
  onCameraToggle 
}: { 
  onMessagesUpdate?: (messages: Message[]) => void
  isCameraEnabled?: boolean
  onCameraToggle?: () => void
}) {
  const connectionState = useConnectionState()
  const localParticipant = useLocalParticipant()
  const voiceAssistant = useVoiceAssistant()
  
  // Get all tracks
  const tracks = useTracks()
  
  // Find local camera track
  const localCameraTrack = tracks.find(
    (trackRef) => 
      trackRef.source === Track.Source.Camera && 
      trackRef.participant instanceof LocalParticipant
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
        transcripts.set(
          s.id,
          segmentToChatMessage(
            s,
            transcripts.get(s.id),
            voiceAssistant.audioTrack!.participant,
          ),
        ),
      )
    }

    // Process local transcripts (user speech) - this is the key part!
    localMessages.segments.forEach((s) =>
      transcripts.set(
        s.id,
        segmentToChatMessage(
          s,
          transcripts.get(s.id),
          localParticipant.localParticipant,
        ),
      ),
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
        timestamp: msg.timestamp
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
      totalMessages: allMessages.length
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
      {/* Background Video */}
      {isCameraActive && localCameraTrack && (
        <div className="absolute inset-0 z-0">
          <VideoTrack
            trackRef={localCameraTrack}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <TranscriptArea messages={messages} />
      </div>

      {/* Status Area */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm relative z-10">
        <div className="flex flex-col items-center space-y-3">

          {/* Status Display */}
          <StatusDisplay 
            state={currentState as any} 
            transcript="" 
            visionActive={false} 
          />

          {/* Visual Feedback */}
          {(currentState === "speaking" || currentState === "listening") && (
            <VisualFeedback 
              trackRef={voiceAssistant.audioTrack}
              state={voiceAssistant.state}
            />
          )}

          {/* Connection indicators */}
          {isConnected && (
            <div className="flex items-center space-x-4 text-xs">
              <div className="text-green-400 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Room Connected
              </div>
              {isAgentConnected && (
                <div className="text-blue-400 flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Agent Ready
                </div>
              )}
              {currentState === "listening" && (
                <div className="text-yellow-400 flex items-center">
                  <span className="animate-pulse mr-1">🎤</span>
                  Listening
                </div>
              )}
              {currentState === "processing" && (
                <div className="text-orange-400 flex items-center">
                  <span className="animate-spin mr-1">⚙️</span>
                  Processing
                </div>
              )}
              {currentState === "speaking" && (
                <div className="text-purple-400 flex items-center">
                  <span className="animate-pulse mr-1">🔊</span>
                  Speaking
                </div>
              )}
              {isCameraActive && (
                <div className="text-cyan-400 flex items-center">
                  <span className="mr-1">📹</span>
                  Camera Active
                </div>
              )}
          </div>
        )}
        </div>
      </div>
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
  const [persistedMessages, setPersistedMessages] = useState<Message[]>([]) // Store chat history
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false)

  // Generate token and connect
  const handleConnect = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Generating LiveKit token...")

      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: 'voice-assistant-room',
          identity: `user_${Date.now()}`,
          name: 'Voice Assistant User',
          agentName: 'voice-assistant-agent',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const { token: newToken, wsUrl: newWsUrl, agentName } = await response.json()
      
      setWsUrl(newWsUrl)
      setToken(newToken)
      setShouldConnect(true)
      
      console.log("Token generated successfully with agent dispatch:", { agentName })
      console.log("Connecting to room...")

    } catch (err) {
      console.error("Failed to generate token:", err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      setError(errorMessage)
      setShouldConnect(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    setShouldConnect(false)
    // Don't clear wsUrl and token so we can reconnect easily
    // Don't clear chat history - keep it visible
    setError(null)
  }

  // Toggle camera function
  const toggleCamera = () => {
    setIsCameraEnabled(!isCameraEnabled)
  }

  // Show initial connection screen only if never connected
  if (!hasEverConnected && (!shouldConnect || !wsUrl || !token)) {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-gray-100 border border-gray-800 rounded-lg overflow-hidden relative">
        {/* Camera Preview (if enabled) */}
        {isCameraEnabled && (
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              ref={(video) => {
                if (video && isCameraEnabled) {
                  navigator.mediaDevices.getUserMedia({ video: true })
                    .then(stream => {
                      video.srcObject = stream
                    })
                    .catch(console.error)
                }
              }}
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              🎤
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">AI Voice Assistant</h3>
            <p className="text-sm text-gray-500 mb-6">Connect to start your conversation</p>
            
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="relative w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
              >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Phone className="h-6 w-6 text-white" />
                  )}
                </div>
              </button>

              {error && (
                <div className="text-xs text-red-400 text-center max-w-xs mt-2">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If we've connected before but are currently disconnected, show the chat interface with history
  if (hasEverConnected && (!shouldConnect || !wsUrl || !token)) {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-gray-100 border border-gray-800 rounded-lg overflow-hidden relative">
        {/* Camera Preview (if enabled) */}
        {isCameraEnabled && (
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              ref={(video) => {
                if (video && isCameraEnabled) {
                  navigator.mediaDevices.getUserMedia({ video: true })
                    .then(stream => {
                      video.srcObject = stream
                    })
                    .catch(console.error)
                }
              }}
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
        )}

        {/* Chat Area with preserved messages */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          <TranscriptArea messages={persistedMessages} />
        </div>

        {/* Status Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm relative z-10">
          <div className="flex flex-col items-center space-y-3">
            <StatusDisplay 
              state="idle" 
              transcript="" 
              visionActive={false} 
            />
            
            {/* Disconnected indicator */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="text-red-400 flex items-center">
                <PhoneOff className="w-3 h-3 mr-1" />
                Call Ended
              </div>
              <div className="text-gray-500">
                Click call button to reconnect
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Action Buttons */}
        <div className="absolute z-30 bottom-4 right-4 flex flex-col space-y-3">
          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`relative w-12 h-12 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isCameraEnabled
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
            }`}
          >
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-center h-full">
              {isCameraEnabled ? (
                <Camera className="h-4 w-4 text-white" />
              ) : (
                <CameraOff className="h-4 w-4 text-white" />
              )}
            </div>
          </button>

          {/* Call Button */}
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="relative w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
          >
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-center h-full">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Phone className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
        </div>
        
        {error && (
          <div className="absolute bottom-20 right-4 max-w-xs">
            <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-800">
              {error}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <LiveKitRoom
      className="flex flex-col h-full bg-gray-950 text-gray-100 border border-gray-800 rounded-lg overflow-hidden"
      serverUrl={wsUrl}
      token={token}
      connect={shouldConnect}
      audio={true}
      video={false}
      onError={(e) => {
        setError(e.message)
        console.error("LiveKit error:", e)
        // Don't automatically disconnect on error - let user retry
      }}
      onConnected={() => {
        console.log("LiveKit: Successfully connected to room")
        setError(null)
        setHasEverConnected(true)
        setIsLoading(false) // Clear loading state on successful connection
      }}
      onDisconnected={(reason) => {
        console.log("LiveKit: Disconnected from room", reason)
        setShouldConnect(false)
        setIsLoading(false) // Clear loading state on disconnect
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Action command bridge */}
        <ActionCommandHandler />
        <VoiceAssistantInner 
          onMessagesUpdate={setPersistedMessages}
          isCameraEnabled={isCameraEnabled}
          onCameraToggle={toggleCamera}
        />
        
        {/* Floating Action Buttons */}
        <div className="absolute z-30 bottom-4 right-4 flex flex-col space-y-3">
          {/* Camera Button - only show when connected */}
          {shouldConnect && (
            <button
              onClick={toggleCamera}
              className={`relative w-12 h-12 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                isCameraEnabled
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
              }`}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
              <div className="relative z-10 flex items-center justify-center h-full">
                {isCameraEnabled ? (
                  <Camera className="h-4 w-4 text-white" />
                ) : (
                  <CameraOff className="h-4 w-4 text-white" />
                )}
              </div>
            </button>
          )}

          {/* Call Button */}
          <button
            onClick={shouldConnect ? handleDisconnect : handleConnect}
            disabled={isLoading}
            className={`relative w-14 h-14 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 ${
              shouldConnect
                ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            } ${isLoading ? "from-gray-600 to-gray-700" : ""}`}
          >
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
            <div className="relative z-10 flex items-center justify-center h-full">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : shouldConnect ? (
                <PhoneOff className="h-5 w-5 text-white" />
              ) : (
                <Phone className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
        </div>
      </div>

      <RoomAudioRenderer />
      <StartAudio label="Click to enable audio playback" />
    </LiveKitRoom>
  )
}

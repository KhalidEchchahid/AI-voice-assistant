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
import { Phone, PhoneOff, Loader2, Mic, MicOff, Camera, CameraOff, AlertCircle } from "lucide-react"
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
  onCameraToggle,
  onError,
  onConnectionStateChange
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
  const [persistedMessages, setPersistedMessages] = useState<Message[]>([])
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false)
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
  const generateToken = useCallback(async (isRetry: boolean = false): Promise<{ token: string; wsUrl: string } | null> => {
    if (connectingRef.current && !isRetry) {
      console.log('🔄 Already connecting, skipping duplicate request')
      return null
    }

    try {
      connectingRef.current = true
      setIsLoading(true)
      setError(null)
      
      console.log('🔄 Generating LiveKit token...', { 
        isRetry, 
        retryCount,
        timestamp: Date.now() 
      })

      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: `voice-assistant-room-${Date.now()}`, // Unique room for each session
          identity: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: 'Voice Assistant User',
          dispatchMode: 'auto', // Use auto dispatch mode
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      const { token: newToken, wsUrl: newWsUrl } = responseData
      
      console.log('✅ Token generated successfully', {
        hasToken: !!newToken,
        hasWsUrl: !!newWsUrl,
        wsUrl: newWsUrl,
        tokenLength: newToken?.length || 0,
        timestamp: Date.now(),
        fullResponse: responseData
      })

      setRetryCount(0) // Reset retry count on success
      return { token: newToken, wsUrl: newWsUrl }

    } catch (err) {
      console.error('❌ Failed to generate token:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      
      // Check for specific error types
      if (errorMessage.includes('Invalid key') || errorMessage.includes('invalid API key')) {
        setError('Invalid LiveKit credentials. Check your environment variables.')
        setRetryCount(0) // Don't retry on auth errors
        return null
      }
      
      setError(errorMessage)
      throw err
    } finally {
      connectingRef.current = false
      setIsLoading(false)
    }
  }, [retryCount])

  // Handle connection - simplified without retry loop
  const handleConnect = useCallback(async () => {
    const now = Date.now()
    
    // Prevent rapid successive connection attempts
    if (now - lastConnectionAttempt < 2000) {
      console.log('🔄 Rate limiting connection attempts')
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
        await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause
      }
      
      setWsUrl(newWsUrl)
      setToken(newToken)
      setShouldConnect(true)
      
      console.log('🔄 Initiating connection...', { wsUrl: newWsUrl, hasToken: !!newToken })

    } catch (err) {
      console.error('❌ Connection failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      setError(errorMessage)
      setShouldConnect(false)
      // REMOVED RETRY LOGIC - User must manually retry
    }
  }, [generateToken, shouldConnect, lastConnectionAttempt, clearReconnectTimeout])

  // Handle disconnect with proper cleanup
  const handleDisconnect = useCallback(async () => {
    console.log('🔄 Disconnecting...')
    clearReconnectTimeout()
    setShouldConnect(false)
    setError(null)
    setRetryCount(0)
    
    // Allow some time for graceful disconnect
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Clear tokens to force regeneration on reconnect
    setWsUrl("")
    setToken("")
    connectingRef.current = false
    
    console.log('✅ Disconnected and cleaned up')
  }, [clearReconnectTimeout])

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state)
    console.log('🔄 Connection state changed:', state)
    
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
        console.log('🔄 Disconnected - manual reconnection required')
        break
        
      case ConnectionState.Reconnecting:
        setError(null)
        break
    }
  }, [clearReconnectTimeout])

  // Handle errors from the inner component
  const handleError = useCallback((errorMessage: string) => {
    console.error('🚨 Voice Assistant Error:', errorMessage)
    setError(errorMessage)
  }, [])

  // Toggle camera function
  const toggleCamera = useCallback(() => {
    setIsCameraEnabled(prev => !prev)
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
          <div className="text-center max-w-md">
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
                <div className="text-xs text-red-400 text-center max-w-xs mt-2 p-2 bg-red-900/20 rounded border border-red-800">
                  <div className="flex items-center justify-center mb-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Connection Error
                  </div>
                  <div className="text-center">{error}</div>
                  {retryCount > 0 && (
                    <div className="text-gray-400 mt-1">
                      Retry {retryCount}/3...
                    </div>
                  )}
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
            <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-800">
              <div className="flex items-center mb-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </div>
              {error}
              {retryCount > 0 && (
                <div className="text-gray-400 mt-1">
                  Retrying... ({retryCount}/3)
                </div>
              )}
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
        const errorMessage = e.message || 'Connection error'
        console.error("🚨 LiveKit Connection Error Details:", {
          message: e.message,
          error: e,
          wsUrl,
          tokenPreview: token ? token.substring(0, 50) + '...' : 'No token',
          tokenLength: token?.length || 0,
          timestamp: new Date().toISOString()
        })
        
        // Specific error handling
        if (errorMessage.includes('invalid API key') || errorMessage.includes('Invalid key')) {
          setError('Invalid LiveKit credentials. Please check your LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.')
        } else if (errorMessage.includes('Failed to connect') || errorMessage.includes('network')) {
          setError('Network connection failed. Please check your LIVEKIT_URL and internet connection.')
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
        
        {/* Floating Action Buttons */}
        <div className="absolute z-30 bottom-4 right-4 flex flex-col space-y-3">
          {/* Camera Button - only show when connected */}
          {shouldConnect && connectionState === ConnectionState.Connected && (
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
        
        {/* Error Display */}
        {error && shouldConnect && (
          <div className="absolute bottom-20 right-4 max-w-xs z-40">
            <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-800 backdrop-blur-sm">
              <div className="flex items-center mb-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                Connection Error
              </div>
              {error}
              {retryCount > 0 && (
                <div className="text-gray-400 mt-1">
                  Retrying... ({retryCount}/3)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <RoomAudioRenderer />
      <StartAudio label="Click to enable audio playback" />
    </LiveKitRoom>
  )
}

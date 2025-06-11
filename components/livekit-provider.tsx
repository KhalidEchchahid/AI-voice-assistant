"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  Room,
  RoomEvent,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type RemoteTrack,
  ConnectionState,
  type DisconnectReason,
  type RoomOptions,
  Track,
} from "livekit-client"

type LiveKitContextType = {
  room: Room | null
  connect: (url: string, token: string, isLocalDev?: boolean) => Promise<void>
  disconnect: () => void
  isConnected: boolean
  connectionState: ConnectionState
  remoteParticipants: Map<string, RemoteParticipant>
  error: Error | null
}

const LiveKitContext = createContext<LiveKitContextType>({
  room: null,
  connect: async () => {},
  disconnect: () => {},
  isConnected: false,
  connectionState: ConnectionState.Disconnected,
  remoteParticipants: new Map(),
  error: null,
})

export const useLiveKit = () => useContext(LiveKitContext)

interface LiveKitProviderProps {
  children: ReactNode
}

export function LiveKitProvider({ children }: LiveKitProviderProps) {
  const [room] = useState(() => {
    // Configure room with options optimized for voice agents
    const roomOptions: RoomOptions = {
      // Enable adaptive streaming for better performance
      adaptiveStream: true,
      dynacast: true,
      
      // Auto-subscribe to all tracks by default
      autoSubscribe: true,
      
      // Enable auto-manage subscriptions
      autoManageVideo: true,
      
      // Publish defaults optimized for voice
      publishDefaults: {
        audioPreset: {
          maxBitrate: 20_000, // Lower bitrate for voice
          priority: 'high',
        },
        dtx: false, // Disable discontinuous transmission for better voice quality
        red: true,  // Enable redundancy for audio
        simulcast: false, // Not needed for audio
      },
      
      // Connection quality and reconnection settings
      disconnectOnPageLeave: true,
      reconnectPolicy: {
        maxAttempts: 3,
        backoffFactor: 1.5,
        maxDelay: 60_000,
      },
    }

    return new Room(roomOptions)
  })
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(new Map())
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleConnectionStateChanged = (state: ConnectionState) => {
      console.log("LiveKit connection state changed:", state)
      setConnectionState(state)
      
      // Update isConnected based on connection state
      const newIsConnected = state === ConnectionState.Connected
      if (isConnected !== newIsConnected) {
        setIsConnected(newIsConnected)
        
        if (newIsConnected) {
          console.log("LiveKit: Successfully connected to room")
          setError(null)
        }
      }
    }

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log("Participant connected:", participant.identity)
      
      // Update remote participants map
      setRemoteParticipants(new Map(room.remoteParticipants))

      // Set up participant-level event listeners
      participant.on(RoomEvent.TrackSubscribed, (track, publication) => {
        console.log(`Subscribed to ${track.kind} track from ${participant.identity}`)
        // Note: Audio playback is handled by LiveKitAudioManager
      })

      participant.on(RoomEvent.TrackUnsubscribed, (track) => {
        console.log(`Unsubscribed from ${track.kind} track`)
        // Note: Audio cleanup is handled by LiveKitAudioManager
      })
    }

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log("Participant disconnected:", participant.identity)
      setRemoteParticipants(new Map(room.remoteParticipants))
    }

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log("Disconnected from room:", reason)
      if (isConnected) {
        setIsConnected(false)
      }
      setConnectionState(ConnectionState.Disconnected)
      setRemoteParticipants(new Map())
      
      // Clear any connection errors when intentionally disconnected
      if (reason === 'CLIENT_INITIATED') {
        setError(null)
      }
    }

    const handleReconnecting = () => {
      console.log("Reconnecting to LiveKit room...")
      setError(null)
    }

    const handleReconnected = () => {
      console.log("Successfully reconnected to LiveKit room")
      setError(null)
      setRemoteParticipants(new Map(room.remoteParticipants))
    }

    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      console.log("Track subscribed:", track.kind, "from", participant.identity)
      // Note: Audio track handling is managed by LiveKitAudioManager
    }

    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      console.log("Track unsubscribed:", track.kind, "from", participant.identity)
      // Note: Audio track cleanup is managed by LiveKitAudioManager
    }

    const handleTrackStreamStateChanged = (
      publication: RemoteTrackPublication,
      streamState: Track.StreamState,
      participant: RemoteParticipant
    ) => {
      console.log(`Track ${publication.trackSid} stream state: ${streamState}`)
    }

    const handleConnectionQualityChanged = (quality: any, participant: any) => {
      console.log(`Connection quality for ${participant?.identity || 'local'}: ${quality}`)
    }

    // Set up event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.Reconnecting, handleReconnecting)
    room.on(RoomEvent.Reconnected, handleReconnected)
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.TrackStreamStateChanged, handleTrackStreamStateChanged)
    room.on(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged)

    // Clean up event listeners
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.Disconnected, handleDisconnected)
      room.off(RoomEvent.Reconnecting, handleReconnecting)
      room.off(RoomEvent.Reconnected, handleReconnected)
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.TrackStreamStateChanged, handleTrackStreamStateChanged)
      room.off(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged)
    }
  }, [room, isConnected])

  // Clean up room on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [room])

  const connect = async (url: string, token: string, isLocalDev = false) => {
    try {
      setError(null)
      console.log("Connecting to LiveKit room...", { url, isLocalDev })

      if (isLocalDev) {
        // For local development, connect without token
        console.log("Connecting in local development mode")

        await room.connect(url, "", { 
          autoSubscribe: true,
          publishDefaults: {
            audioPreset: {
              maxBitrate: 20_000,
              priority: 'high',
            },
          },
        })

        // Set local participant name for local dev
        if (room.localParticipant) {
          room.localParticipant.setName(`LocalUser-${Math.floor(Math.random() * 1000)}`)
        }

        console.log("Connected to LiveKit room in local development mode")
      } else {
        // Production connection with token
        await room.connect(url, token, {
          autoSubscribe: true,
          publishDefaults: {
            audioPreset: {
              maxBitrate: 20_000,
              priority: 'high',
            },
          },
        })
        console.log("Connected to LiveKit room with token")
      }

      // Update state and participants
      if (!isConnected) {
        setIsConnected(true)
      }
      setRemoteParticipants(new Map(room.remoteParticipants))
      
    } catch (err) {
      console.error("Failed to connect to LiveKit room:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    }
  }

  const disconnect = () => {
    console.log("Disconnecting from LiveKit room")
    room.disconnect()
    setIsConnected(false)
    setRemoteParticipants(new Map())
    setError(null)
  }

  const value = {
    room,
    connect,
    disconnect,
    isConnected,
    connectionState,
    remoteParticipants,
    error,
  }

  return <LiveKitContext.Provider value={value}>{children}</LiveKitContext.Provider>
}

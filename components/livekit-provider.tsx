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
    // Configure room with options similar to LiveKit Agents Playground
    const roomOptions: RoomOptions = {
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [
          {
            width: 1280,
            height: 720,
            resolution: { width: 1280, height: 720 },
            encoding: { maxBitrate: 1500000, maxFramerate: 30 },
          },
          {
            width: 640,
            height: 360,
            resolution: { width: 640, height: 360 },
            encoding: { maxBitrate: 500_000, maxFramerate: 30 },
          },
          {
            width: 320,
            height: 180,
            resolution: { width: 320, height: 180 },
            encoding: { maxBitrate: 150_000, maxFramerate: 15 },
          },
        ],
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
      console.log("Connection state changed:", state)
      setConnectionState(state)
      // Only update isConnected if it's different from the current value
      const newIsConnected = state === ConnectionState.Connected
      if (isConnected !== newIsConnected) {
        setIsConnected(newIsConnected)
      }
    }

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log("Participant connected:", participant.identity)
      // Create a new Map to trigger a single update
      setRemoteParticipants(new Map(room.remoteParticipants))

      // Subscribe to all tracks
      participant.on(RoomEvent.TrackSubscribed, (track, publication) => {
        console.log(`Subscribed to ${track.kind} track from ${participant.identity}`)
      })
    }

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log("Participant disconnected:", participant.identity)
      // Create a new Map to trigger a single update
      setRemoteParticipants(new Map(room.remoteParticipants))
    }

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log("Disconnected from room:", reason)
      if (isConnected) {
        setIsConnected(false)
      }
      setConnectionState(ConnectionState.Disconnected)
    }

    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      console.log("Track subscribed:", track.kind, "from", participant.identity)

      // Automatically attach audio tracks
      if (track.kind === Track.Kind.Audio) {
        track.attach()
      }
    }

    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      console.log("Track unsubscribed:", track.kind, "from", participant.identity)

      // Detach audio tracks
      if (track.kind === Track.Kind.Audio) {
        track.detach()
      }
    }

    // Set up event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)

    // Clean up event listeners
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.Disconnected, handleDisconnected)
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
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

      if (isLocalDev) {
        // For local development, we'll use a simpler connection approach
        console.log("Connecting in local development mode")

        // Generate a random identity for local development
        const localIdentity = `local-user-${Math.floor(Math.random() * 10000)}`

        // Connect without a token in local development mode
        // This assumes your local LiveKit server is configured to allow connections without tokens
        await room.connect(url, "", { autoSubscribe: true })

        // Set local participant name
        if (room.localParticipant) {
          room.localParticipant.setName(`LocalUser-${Math.floor(Math.random() * 1000)}`)
        }

        console.log("Connected to LiveKit room in local development mode")
      } else {
        // Normal connection with token for production
        await room.connect(url, token, {
          autoSubscribe: true,
        })
        console.log("Connected to LiveKit room")
      }

      // Only set if not already connected
      if (!isConnected) {
        setIsConnected(true)
      }
      setRemoteParticipants(new Map(room.remoteParticipants))
    } catch (err) {
      console.error("Failed to connect to LiveKit room:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const disconnect = () => {
    room.disconnect()
    setIsConnected(false)
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

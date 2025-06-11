"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { 
  Track, 
  LocalTrackPublication, 
  RemoteTrackPublication,
  createLocalAudioTrack,
  RoomEvent
} from "livekit-client"

interface LiveKitAudioManagerProps {
  isConnected: boolean
  onAudioStateChange?: (isReceivingAudio: boolean, isTransmittingAudio: boolean) => void
  onError?: (error: string) => void
}

export default function LiveKitAudioManager({ 
  isConnected, 
  onAudioStateChange,
  onError 
}: LiveKitAudioManagerProps) {
  const { room } = useLiveKit()
  const [micTrack, setMicTrack] = useState<LocalTrackPublication | null>(null)
  const [isTransmittingAudio, setIsTransmittingAudio] = useState(false)
  const [isReceivingAudio, setIsReceivingAudio] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const audioPlayingRef = useRef<Set<string>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)

  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true)
      console.log("LiveKitAudioManager: User interaction detected, autoplay enabled")
      
      // Try to resume audio context if it exists
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log("LiveKitAudioManager: AudioContext resumed")
        }).catch((err) => {
          console.warn("LiveKitAudioManager: Failed to resume AudioContext:", err)
        })
      }
      
      // Try to play any existing audio elements
      audioElementsRef.current.forEach((audioElement, trackSid) => {
        if (audioElement.paused) {
          audioElement.play().catch((err) => {
            console.warn(`LiveKitAudioManager: Failed to play audio after user interaction for track ${trackSid}:`, err)
          })
        }
      })
    }

    // Listen for various user interaction events
    const events = ['click', 'touchstart', 'keydown', 'mousedown']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [])

  // Update receiving audio state based on actually playing elements
  const updateReceivingAudioState = useCallback(() => {
    const isAnyAudioPlaying = audioPlayingRef.current.size > 0
    console.log(`LiveKitAudioManager: Audio playing count: ${audioPlayingRef.current.size}, isReceivingAudio: ${isAnyAudioPlaying}`)
    
    if (isAnyAudioPlaying !== isReceivingAudio) {
      setIsReceivingAudio(isAnyAudioPlaying)
    }
  }, [isReceivingAudio])

  // Cleanup audio elements
  const cleanupAudioElements = useCallback(() => {
    console.log("LiveKitAudioManager: Cleaning up audio elements")
    audioElementsRef.current.forEach((audioElement) => {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement.remove()
    })
    audioElementsRef.current.clear()
    audioPlayingRef.current.clear()
    setIsReceivingAudio(false)
  }, [])

  // Start microphone and publish audio track
  const startMicrophone = useCallback(async () => {
    if (!room || !isConnected || micTrack) return

    try {
      console.log("LiveKitAudioManager: Starting microphone...")
      
      // Create local audio track with optimized settings for voice
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      })

      // Publish the audio track
      const publication = await room.localParticipant.publishTrack(audioTrack, {
        name: "microphone",
        source: Track.Source.Microphone,
      })

      setMicTrack(publication as LocalTrackPublication)
      setIsTransmittingAudio(true)
      
      console.log("LiveKitAudioManager: Microphone started and published successfully")
      
    } catch (err) {
      console.error("LiveKitAudioManager: Error starting microphone:", err)
      onError?.("Failed to start microphone")
    }
  }, [room, isConnected, micTrack, onError])

  // Stop microphone
  const stopMicrophone = useCallback(async () => {
    if (!micTrack || !room) return

    try {
      console.log("LiveKitAudioManager: Stopping microphone...")
      
      // Stop the track
      micTrack.track?.stop()
      
      // Unpublish the track
      if (micTrack.track) {
        await room.localParticipant.unpublishTrack(micTrack.track)
      }
      
      setMicTrack(null)
      setIsTransmittingAudio(false)
      
      console.log("LiveKitAudioManager: Microphone stopped")
      
    } catch (err) {
      console.error("LiveKitAudioManager: Error stopping microphone:", err)
    }
  }, [micTrack, room])

  // Handle remote audio track subscription
  const handleRemoteAudioTrack = useCallback((
    track: Track,
    publication: RemoteTrackPublication,
    participantIdentity: string
  ) => {
    if (track.kind !== Track.Kind.Audio) return

    console.log(`LiveKitAudioManager: Received audio track from ${participantIdentity}`)

    // Create audio element for playback with better configuration
    const audioElement = document.createElement('audio')
    audioElement.setAttribute('playsinline', 'true')
    audioElement.setAttribute('preload', 'auto')
    audioElement.controls = false
    audioElement.style.display = 'none'
    audioElement.muted = false
    audioElement.volume = 1.0
    
    // Set up audio event listeners BEFORE attaching track
    const trackSid = publication.trackSid

    audioElement.addEventListener('canplay', () => {
      console.log(`LiveKitAudioManager: Audio can play for track ${trackSid}`)
      // Try to play immediately when audio is ready
      if (userInteracted) {
        audioElement.play().catch((err) => {
          console.warn(`LiveKitAudioManager: Failed to auto-play after canplay for track ${trackSid}:`, err)
        })
      }
    })

    audioElement.addEventListener('play', () => {
      console.log(`LiveKitAudioManager: Audio started playing for track ${trackSid}`)
      audioPlayingRef.current.add(trackSid)
      updateReceivingAudioState()
    })

    audioElement.addEventListener('pause', () => {
      console.log(`LiveKitAudioManager: Audio paused for track ${trackSid}`)
      audioPlayingRef.current.delete(trackSid)
      updateReceivingAudioState()
    })

    audioElement.addEventListener('ended', () => {
      console.log(`LiveKitAudioManager: Audio ended for track ${trackSid}`)
      audioPlayingRef.current.delete(trackSid)
      updateReceivingAudioState()
    })

    audioElement.addEventListener('error', (e) => {
      console.error(`LiveKitAudioManager: Audio error for track ${trackSid}:`, e)
      audioPlayingRef.current.delete(trackSid)
      updateReceivingAudioState()
    })

    audioElement.addEventListener('loadeddata', () => {
      console.log(`LiveKitAudioManager: Audio data loaded for track ${trackSid}`)
    })

    audioElement.addEventListener('loadedmetadata', () => {
      console.log(`LiveKitAudioManager: Audio metadata loaded for track ${trackSid}`)
    })

    // Attach the track to the audio element
    track.attach(audioElement)
    
    // Add to page for playback
    document.body.appendChild(audioElement)
    
    // Store reference
    audioElementsRef.current.set(trackSid, audioElement)

    // Try to play audio immediately if user has interacted
    if (userInteracted) {
      const playPromise = audioElement.play()
      if (playPromise) {
        playPromise
          .then(() => {
            console.log(`LiveKitAudioManager: Audio auto-play started for track ${trackSid}`)
          })
          .catch((err) => {
            console.warn(`LiveKitAudioManager: Auto-play failed for track ${trackSid}:`, err)
            // For autoplay failures, we'll wait for user interaction
            console.log(`LiveKitAudioManager: Waiting for user interaction to play audio for track ${trackSid}`)
          })
      }
    } else {
      console.log(`LiveKitAudioManager: Waiting for user interaction to enable audio playback for track ${trackSid}`)
      // Set autoplay attribute to try playing when user interacts
      audioElement.autoplay = true
    }

  }, [updateReceivingAudioState, userInteracted])

  // Handle remote audio track unsubscription
  const handleRemoteAudioTrackUnsubscribed = useCallback((
    track: Track,
    publication: RemoteTrackPublication
  ) => {
    if (track.kind !== Track.Kind.Audio) return

    const trackSid = publication.trackSid
    console.log(`LiveKitAudioManager: Remote audio track unsubscribed: ${trackSid}`)

    // Clean up audio element
    const audioElement = audioElementsRef.current.get(trackSid)
    if (audioElement) {
      track.detach(audioElement)
      audioElement.pause()
      audioElement.remove()
      audioElementsRef.current.delete(trackSid)
    }

    // Remove from playing set
    audioPlayingRef.current.delete(trackSid)
    updateReceivingAudioState()
  }, [updateReceivingAudioState])

  // Auto-start microphone when connected
  useEffect(() => {
    if (isConnected && room && !micTrack) {
      // Small delay to ensure room is fully initialized
      const timer = setTimeout(() => {
        startMicrophone()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, room, micTrack, startMicrophone])

  // Set up remote track event listeners
  useEffect(() => {
    if (!room || !isConnected) return

    const handleTrackSubscribed = (
      track: Track,
      publication: RemoteTrackPublication,
      participant: any
    ) => {
      if (track.kind === Track.Kind.Audio) {
        handleRemoteAudioTrack(track, publication, participant.identity)
      }
    }

    const handleTrackUnsubscribed = (
      track: Track,
      publication: RemoteTrackPublication
    ) => {
      if (track.kind === Track.Kind.Audio) {
        handleRemoteAudioTrackUnsubscribed(track, publication)
      }
    }

    // Subscribe to existing audio tracks
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.track) {
          handleRemoteAudioTrack(publication.track, publication, participant.identity)
        }
      })
    })

    // Listen for new track subscriptions
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    }
  }, [room, isConnected, handleRemoteAudioTrack, handleRemoteAudioTrackUnsubscribed])

  // Report audio state changes
  useEffect(() => {
    onAudioStateChange?.(isReceivingAudio, isTransmittingAudio)
  }, [isReceivingAudio, isTransmittingAudio, onAudioStateChange])

  // Cleanup when disconnected
  useEffect(() => {
    if (!isConnected) {
      stopMicrophone()
      cleanupAudioElements()
    }
  }, [isConnected, stopMicrophone, cleanupAudioElements])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone()
      cleanupAudioElements()
    }
  }, [stopMicrophone, cleanupAudioElements])

  // This component doesn't render anything visible
  return null
} 
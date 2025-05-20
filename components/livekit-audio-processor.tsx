"use client"

import { useEffect, useRef } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { Track } from "livekit-client"

interface LiveKitAudioProcessorProps {
  isProcessing: boolean
  onAudioData?: (audioData: Float32Array) => void
}

export default function LiveKitAudioProcessor({ isProcessing, onAudioData }: LiveKitAudioProcessorProps) {
  const { room } = useLiveKit()
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (!room || !isProcessing) return

    // Find audio tracks from remote participants
    const setupAudioProcessing = async () => {
      try {
        // Get all remote participants
        const participants = Array.from(room.remoteParticipants.values())

        // Find the first audio track
        let audioTrack: MediaStreamTrack | undefined

        for (const participant of participants) {
          const audioTracks = Array.from(participant.audioTrackPublications.values())
          for (const trackPublication of audioTracks) {
            if (trackPublication.track && trackPublication.track.kind === Track.Kind.Audio) {
              audioTrack = trackPublication.track.mediaStreamTrack
              break
            }
          }
          if (audioTrack) break
        }

        if (!audioTrack) {
          console.log("No remote audio track found")
          return
        }

        // Create audio context and nodes
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext()
        }

        const audioContext = audioContextRef.current

        // Create a MediaStream with the audio track
        const mediaStream = new MediaStream([audioTrack])

        // Create source node
        sourceNodeRef.current = audioContext.createMediaStreamSource(mediaStream)

        // Create analyser node
        analyserRef.current = audioContext.createAnalyser()
        analyserRef.current.fftSize = 2048

        // Connect nodes
        sourceNodeRef.current.connect(analyserRef.current)

        // Process audio data
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Float32Array(bufferLength)

        const processAudio = () => {
          if (!analyserRef.current || !isProcessing) return

          analyserRef.current.getFloatTimeDomainData(dataArray)

          if (onAudioData) {
            onAudioData(dataArray)
          }

          requestAnimationFrame(processAudio)
        }

        processAudio()
      } catch (err) {
        console.error("Error setting up audio processing:", err)
      }
    }

    setupAudioProcessing()

    return () => {
      // Clean up audio processing
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error)
      }
    }
  }, [room, isProcessing, onAudioData])

  return null
}

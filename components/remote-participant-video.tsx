"use client"

import { useEffect, useRef } from "react"
import { type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication, Track } from "livekit-client"
import { cn } from "@/lib/utils"

interface RemoteParticipantVideoProps {
  participant: RemoteParticipant
  className?: string
}

export default function RemoteParticipantVideo({ participant, className }: RemoteParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const handleTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current)
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current)
      }
    }

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach()
    }

    // Subscribe to existing tracks
    participant.videoTrackPublications.forEach((publication: RemoteTrackPublication) => {
      if (publication.isSubscribed && videoRef.current) {
        publication.track?.attach(videoRef.current)
      }
    })

    participant.audioTrackPublications.forEach((publication: RemoteTrackPublication) => {
      if (publication.isSubscribed && audioRef.current) {
        publication.track?.attach(audioRef.current)
      }
    })

    // Set up event listeners
    participant.on("trackSubscribed", handleTrackSubscribed)
    participant.on("trackUnsubscribed", handleTrackUnsubscribed)

    // Clean up
    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed)
      participant.off("trackUnsubscribed", handleTrackUnsubscribed)

      participant.videoTrackPublications.forEach((publication: RemoteTrackPublication) => {
        if (publication.isSubscribed) {
          publication.track?.detach()
        }
      })

      participant.audioTrackPublications.forEach((publication: RemoteTrackPublication) => {
        if (publication.isSubscribed) {
          publication.track?.detach()
        }
      })
    }
  }, [participant])


  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-black", className)}>
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <audio ref={audioRef} autoPlay />
      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded-md">
        {participant.identity}
      </div>
    </div>
  )
}

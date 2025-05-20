"use client"

import { useEffect, useRef, useState } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { VideoPresets, type LocalTrackPublication, createLocalVideoTrack, createLocalAudioTrack } from "livekit-client"
import { Camera, CameraOff, Maximize2, Minimize2, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LiveKitVideoProps {
  className?: string
}

export default function LiveKitVideo({ className }: LiveKitVideoProps) {
  const { room, isConnected } = useLiveKit()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [cameraTrack, setCameraTrack] = useState<LocalTrackPublication | null>(null)
  const [micTrack, setMicTrack] = useState<LocalTrackPublication | null>(null)

  // Handle camera toggle
  const toggleCamera = async () => {
    if (!room) return

    try {
      if (cameraEnabled && cameraTrack) {
        // Stop and unpublish existing camera track
         cameraTrack.track?.stop()
        if (cameraTrack.track) {
          await room.localParticipant.unpublishTrack(cameraTrack.track)
        }
        setCameraTrack(null)
        setCameraEnabled(false)
      } else {
        // Create and publish a new camera track
        const track = await createLocalVideoTrack({
          resolution: VideoPresets.h720,
        })
        const publication = await room.localParticipant.publishTrack(track)
        setCameraTrack(publication as LocalTrackPublication)
        setCameraEnabled(true)
      }
    } catch (err) {
      console.error("Error toggling camera:", err)
    }
  }

  // Handle microphone toggle
  const toggleMic = async () => {
    if (!room) return

    try {
      if (micEnabled && micTrack) {
        // Stop and unpublish existing microphone track
       micTrack.track?.stop()
        if (micTrack.track) {
          await room.localParticipant.unpublishTrack(micTrack.track)
        }
        setMicTrack(null)
        setMicEnabled(false)
      } else {
        // Create and publish a new microphone track
        const track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })
        const publication = await room.localParticipant.publishTrack(track)
        setMicTrack(publication as LocalTrackPublication)
        setMicEnabled(true)
      }
    } catch (err) {
      console.error("Error toggling microphone:", err)
    }
  }

  // Auto-publish microphone track when connected
  useEffect(() => {
    if (!room || !isConnected) return

    const publishMicrophone = async () => {
      try {
        if (!micEnabled) {
          const track = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          })
          const publication = await room.localParticipant.publishTrack(track)
          setMicTrack(publication as LocalTrackPublication)
          setMicEnabled(true)
        }
      } catch (err) {
        console.error("Error publishing microphone:", err)
      }
    }

    publishMicrophone()
  }, [room, isConnected, micEnabled])

  // Attach local video to video element
  useEffect(() => {
    if (cameraTrack && cameraTrack.track && videoRef.current) {
      const mediaStream = new MediaStream()
      mediaStream.addTrack(cameraTrack.track.mediaStreamTrack)
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch((error) => console.error("Error playing video:", error))
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [cameraTrack])

  // Clean up tracks on unmount
  useEffect(() => {
    return () => {
      if (room) {
        if (cameraTrack) {
          cameraTrack.track?.stop()
          if (cameraTrack.track) {
            room.localParticipant.unpublishTrack(cameraTrack.track)
          }
        }
        if (micTrack) {
          micTrack.track?.stop()
          if (micTrack.track) {
            room.localParticipant.unpublishTrack(micTrack.track)
          }
        }
      }
    }
  }, [room, cameraTrack, micTrack])

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  if (!isConnected) {
    return null
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-black",
        expanded ? "w-full h-[200px]" : "w-[120px] h-[90px]",
        "transition-all duration-300",
        className,
      )}
    >
      {cameraEnabled ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-800">
          <Camera className="w-6 h-6 text-gray-400" />
        </div>
      )}

      <div className="absolute top-1 right-1 flex space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-black/50 text-white hover:bg-black/70 rounded-full"
          onClick={toggleExpand}
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button>
      </div>

      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex items-center space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 bg-black/50 hover:bg-black/70 rounded-full",
            cameraEnabled ? "text-white" : "text-red-500",
          )}
          onClick={toggleCamera}
        >
          {cameraEnabled ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 bg-black/50 hover:bg-black/70 rounded-full",
            micEnabled ? "text-white" : "text-red-500",
          )}
          onClick={toggleMic}
        >
          {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
        </Button>
      </div>

      {cameraEnabled && (
        <div className="absolute bottom-1 left-1 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
          <span className="text-[10px] text-white">LIVE</span>
        </div>
      )}

      {micEnabled && !cameraEnabled && (
        <div className="absolute bottom-1 left-1 flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
          <span className="text-[10px] text-white">MIC ON</span>
        </div>
      )}
    </div>
  )
}

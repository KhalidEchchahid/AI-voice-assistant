"use client"

import { useRef, useEffect, useState } from "react"
import { Camera, CameraOff, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CameraFeedProps {
  active: boolean
  onToggle: () => void
  className?: string
}

export default function CameraFeed({ active, onToggle, className }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        if (active && videoRef.current) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          videoRef.current.srcObject = stream
          setPermissionDenied(false)
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setPermissionDenied(true)
      }
    }

    const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    }

    if (active) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [active])

  const toggleExpand = () => {
    setExpanded(!expanded)
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
      {permissionDenied ? (
        <div className="flex flex-col items-center justify-center h-full p-2 text-white bg-gray-800">
          <CameraOff className="w-5 h-5 mb-1 text-red-500" />
          <p className="text-xs text-center">Camera access denied</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover", !active && "hidden")}
          />

          {!active && (
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
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 bg-black/50 hover:bg-black/70 rounded-full",
                active ? "text-red-500" : "text-white",
              )}
              onClick={onToggle}
            >
              {active ? <CameraOff className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
            </Button>
          </div>

          {active && (
            <div className="absolute bottom-1 left-1 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
              <span className="text-[10px] text-white">LIVE</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

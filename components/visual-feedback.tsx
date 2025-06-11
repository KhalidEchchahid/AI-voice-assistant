"use client"

import { 
  BarVisualizer,
  TrackReferenceOrPlaceholder,
  type AgentState
} from "@livekit/components-react"
import { useEffect } from "react"

interface VisualFeedbackProps {
  trackRef?: TrackReferenceOrPlaceholder
  state?: AgentState
  className?: string
  barCount?: number
  height?: number
}

export default function VisualFeedback({ 
  trackRef, 
  state,
  className = "mt-2 mb-4",
  barCount = 5,
  height = 50
}: VisualFeedbackProps) {
  
  // Set up CSS custom properties for the theme color (exactly like agents-playground)
  useEffect(() => {
    // Set the theme color CSS variable that BarVisualizer uses
    document.body.style.setProperty(
      "--lk-theme-color",
      "rgb(59, 130, 246)" // blue-500
    );
  }, [])

  return (
    <div className={className}>
      <div 
        className="flex items-center justify-center w-full rounded-md bg-gray-900/30 border border-gray-800"
        style={{ height: `${height}px` }}
      >
        {trackRef ? (
          <div className="flex items-center justify-center w-full h-full [--lk-va-bar-width:30px] [--lk-va-bar-gap:20px] [--lk-fg:var(--lk-theme-color)]">
            <BarVisualizer
              state={state}
              trackRef={trackRef}
              barCount={barCount}
              options={{ minHeight: 20 }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center text-gray-600 text-sm">
            <span className="animate-pulse">🎤</span>
            <span className="ml-2">Waiting for audio...</span>
          </div>
        )}
      </div>
    </div>
  )
}

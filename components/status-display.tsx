import type React from "react"

interface StatusDisplayProps {
  state: "idle" | "listening" | "processing" | "speaking" | "vision_processing" | "error" | "connecting"
  transcript: string
  visionActive: boolean
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, transcript, visionActive }) => {
  const getStatusText = () => {
    switch (state) {
      case "idle":
        return visionActive ? "Camera active - show me something" : "Tap the microphone to speak"
      case "listening":
        return transcript ? `Listening: "${transcript}"` : "Listening..."
      case "processing":
        return "Processing..."
      case "speaking":
        return "Assistant is speaking..."
      case "vision_processing":
        return "Analyzing what I see..."
      case "error":
        return "Sorry, there was an error"
      case "connecting":
        return "Connecting..."
      default:
        return ""
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{getStatusText()}</p>
      {transcript && state !== "listening" && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-[280px] text-center">"{transcript}"</p>
      )}
    </div>
  )
}

export default StatusDisplay

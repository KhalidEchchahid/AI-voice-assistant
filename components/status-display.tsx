import type React from "react"

interface StatusDisplayProps {
  state: "idle" | "listening" | "processing" | "speaking" | "error" | "connecting"
  transcript: string
  visionActive: boolean
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, transcript }) => {
  const getStatusText = () => {
    switch (state) {
      case "idle":
        return "Ready to assist you"
      case "listening":
        return transcript ? `Listening: "${transcript}"` : "Listening..."
      case "processing":
        return transcript ? `Processing: "${transcript}"` : "Processing your request..."
      case "speaking":
        return "Assistant is responding..."
      case "error":
        return "Something went wrong, please try again"
      case "connecting":
        return "Connecting to agent..."
      default:
        return "Ready"
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case "listening":
        return "text-green-400"
      case "processing":
        return "text-yellow-400"
      case "speaking":
        return "text-blue-400"
      case "error":
        return "text-red-400"
      case "connecting":
        return "text-gray-400"
      default:
        return "text-gray-300"
    }
  }

  return (
    <div className="text-center">
      <p className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </p>
      {transcript && state === "listening" && (
        <p className="mt-1 text-xs text-gray-500 max-w-[280px] mx-auto">
          "{transcript}"
        </p>
      )}
    </div>
  )
}

export default StatusDisplay

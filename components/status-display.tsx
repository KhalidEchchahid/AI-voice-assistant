import type React from "react"
import { Loader2, Volume2 } from "lucide-react"

interface StatusDisplayProps {
  state: "idle" | "listening" | "processing" | "speaking" | "error" | "connecting"
  transcript: string
  visionActive: boolean
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, transcript }) => {
  // Only show status for processing and speaking states
  if (state !== "processing" && state !== "speaking") {
    return null
  }

  const getStatusConfig = () => {
    switch (state) {
      case "processing":
        return {
          text: "Thinking...",
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
        }
      case "speaking":
        return {
          text: "Responding...",
          icon: <Volume2 className="w-4 h-4 animate-pulse" />,
          color: "text-violet-400",
          bgColor: "bg-violet-500/10",
          borderColor: "border-violet-500/30",
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  return (
    <div className="text-center">
      {/* Compact status indicator */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-300 ${config.bgColor} ${config.borderColor}`}
      >
        <div className={config.color}>{config.icon}</div>
        <p className={`text-xs font-medium ${config.color}`}>{config.text}</p>
      </div>
    </div>
  )
}

export default StatusDisplay

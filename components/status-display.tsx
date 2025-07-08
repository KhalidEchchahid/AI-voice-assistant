import type React from "react"
import { Loader2, Volume2 } from "lucide-react"

interface StatusDisplayProps {
  state: "idle" | "listening" | "processing" | "speaking" | "error" | "connecting"
  transcript: string
  visionActive: boolean
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, transcript }) => {
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
        return {
          text: "Ready...",
          icon: <Volume2 className="w-4 h-4" />,
          color: "text-gray-400",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/30",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="text-center">
      {/* Compact status indicator - ALWAYS RENDERED to prevent layout shifts */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-300 ${config.bgColor} ${config.borderColor}`}
        style={{
          minWidth: "120px", // Fixed minimum width
          minHeight: "32px", // Fixed minimum height
        }}
      >
        <div className={config.color}>{config.icon}</div>
        <p className={`text-xs font-medium ${config.color}`}>{config.text}</p>
      </div>
    </div>
  )
}

export default StatusDisplay

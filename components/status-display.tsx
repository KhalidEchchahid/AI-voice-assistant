import type React from "react"
import { Loader2, Mic, Volume2, Zap, AlertTriangle, Wifi } from "lucide-react"

interface StatusDisplayProps {
  state: "idle" | "listening" | "processing" | "speaking" | "error" | "connecting"
  transcript: string
  visionActive: boolean
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, transcript }) => {
  const getStatusConfig = () => {
    switch (state) {
      case "idle":
        return {
          text: "Ready to assist you",
          icon: <Zap className="w-4 h-4" />,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted-foreground/20",
        }
      case "listening":
        return {
          text: transcript ? `Listening: "${transcript}"` : "Listening...",
          icon: <Mic className="w-4 h-4 animate-pulse" />,
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/30",
        }
      case "processing":
        return {
          text: transcript ? `Processing: "${transcript}"` : "Processing your request...",
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
        }
      case "speaking":
        return {
          text: "Assistant is responding...",
          icon: <Volume2 className="w-4 h-4 animate-pulse" />,
          color: "text-violet-400",
          bgColor: "bg-violet-500/10",
          borderColor: "border-violet-500/30",
        }
      case "error":
        return {
          text: "Something went wrong, please try again",
          icon: <AlertTriangle className="w-4 h-4" />,
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        }
      case "connecting":
        return {
          text: "Connecting to agent...",
          icon: <Wifi className="w-4 h-4 animate-pulse" />,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
        }
      default:
        return {
          text: "Ready",
          icon: <Zap className="w-4 h-4" />,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted-foreground/20",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="text-center space-y-3">
      {/* Status indicator */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-300 ${config.bgColor} ${config.borderColor}`}
      >
        <div className={config.color}>{config.icon}</div>
        <p className={`text-sm font-medium ${config.color}`}>{config.text}</p>
      </div>

      {/* Transcript preview */}
      {transcript && state === "listening" && (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 max-w-[320px] mx-auto">
          <p className="text-xs text-muted-foreground mb-1">Live transcript:</p>
          <p className="text-sm text-foreground font-medium">"{transcript}"</p>
        </div>
      )}
    </div>
  )
}

export default StatusDisplay

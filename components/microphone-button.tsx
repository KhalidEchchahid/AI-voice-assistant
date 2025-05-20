"use client"

import { Mic, MicOff, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AssistantState } from "@/components/voice-assistant"
import { cn } from "@/lib/utils"

interface MicrophoneButtonProps {
  state: AssistantState
  onClick: () => void
}

export default function MicrophoneButton({ state, onClick }: MicrophoneButtonProps) {
  const isActive = state === "listening" || state === "processing"

  return (
    <Button
      onClick={onClick}
      disabled={state === "connecting"}
      variant="outline"
      size="icon"
      className={cn(
        "h-16 w-16 rounded-full border-2 transition-all duration-300 relative",
        isActive
          ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-500"
          : "border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:text-blue-500",
        state === "speaking" && "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-500",
        state === "error" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-500",
        state === "connecting" && "border-gray-300 dark:border-gray-700 opacity-50",
      )}
    >
      {state === "listening" && <div className="absolute inset-0 rounded-full animate-ping-slow bg-red-500/10"></div>}

      {state === "listening" ? (
        <Square className="h-6 w-6" />
      ) : state === "speaking" ? (
        <Mic className="h-6 w-6 animate-pulse" />
      ) : state === "error" || state === "connecting" ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </Button>
  )
}

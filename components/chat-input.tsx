"use client"

import type React from "react"

import { useState } from "react"
import { Send, Mic, MicOff, Paperclip, ImageIcon, Smile } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage?: (message: string) => void
  onVoiceToggle?: () => void
  isVoiceActive?: boolean
  isConnected?: boolean
  disabled?: boolean
}

export default function ChatInput({
  onSendMessage,
  onVoiceToggle,
  isVoiceActive = false,
  isConnected = false,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="p-4 bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-xl border-t border-border/50 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/2 via-transparent to-cyan-500/2" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),transparent_70%)]" />

      <form onSubmit={handleSubmit} className="relative z-10">
        <div
          className={cn(
            "flex items-end space-x-3 p-3 rounded-2xl border transition-all duration-300 bg-background/80 backdrop-blur-sm",
            isFocused
              ? "border-violet-500/50 shadow-lg shadow-violet-500/10"
              : "border-border/50 hover:border-border/80",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {/* Attachment Button */}
          <button
            type="button"
            disabled={disabled}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="flex-1 min-h-[40px] max-h-32 overflow-y-auto">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isConnected ? "Type a message or use voice..." : "Connect to start chatting..."}
              disabled={disabled}
              className="w-full resize-none bg-transparent border-none outline-none placeholder:text-muted-foreground/60 text-sm leading-relaxed disabled:cursor-not-allowed"
              rows={1}
              style={{
                minHeight: "24px",
                maxHeight: "96px",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Image Button */}
            <button
              type="button"
              disabled={disabled}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
              title="Add image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Emoji Button */}
            <button
              type="button"
              disabled={disabled}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Voice Button */}
            <button
              type="button"
              onClick={onVoiceToggle}
              disabled={disabled}
              className={cn(
                "w-9 h-9 rounded-full transition-all duration-300 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-sm",
                isVoiceActive
                  ? "bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-red-500/25 hover:from-red-600 hover:to-pink-600"
                  : "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-violet-500/25 hover:from-violet-600 hover:to-purple-600",
              )}
              title={isVoiceActive ? "Stop recording" : "Start voice input"}
            >
              {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={disabled || !message.trim()}
              className={cn(
                "w-9 h-9 rounded-full transition-all duration-300 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 shadow-sm",
                message.trim() && !disabled
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-muted-foreground/60">
            {isConnected ? (
              <>
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send,{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> for new line
              </>
            ) : (
              "Connect to the AI assistant to start chatting"
            )}
          </p>
          <div className="text-xs text-muted-foreground/40">{message.length}/2000</div>
        </div>
      </form>
    </div>
  )
}

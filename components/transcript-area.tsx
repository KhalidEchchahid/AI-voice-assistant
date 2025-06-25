"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Bot, User, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

// Define the Message type here since we're not importing it
export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

interface TranscriptAreaProps {
  messages: Message[]
}

export default function TranscriptArea({ messages }: TranscriptAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 animate-pulse" />

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-violet-400/30 rounded-full animate-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center relative z-10">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/25">
              <Bot className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20 animate-pulse" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-violet-400 animate-bounce" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-3">
            AI Voice Assistant
          </h3>
          <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
            Connect to the agent and start speaking to see your conversation here. Experience the future of AI
            communication.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Compact Chat Header */}
      <div className="p-3 border-b border-border/50 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/30 to-purple-500/30 animate-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">AI Voice Assistant</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live conversation
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </div>

      {/* Enhanced Messages with Custom Scrollbar */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm relative custom-scrollbar"
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.05),transparent_50%)] pointer-events-none" />

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-4 animate-in slide-in-from-bottom-2 duration-500",
              message.role === "user" ? "flex-row-reverse space-x-reverse" : "",
              "group",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Enhanced Avatar */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative transition-all duration-300 group-hover:scale-105",
                message.role === "user"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25",
              )}
            >
              {message.role === "user" ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Enhanced Message bubble */}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-5 py-4 relative backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg",
                message.role === "user"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-md shadow-lg shadow-emerald-500/20"
                  : "bg-gradient-to-br from-card/80 to-card/60 text-card-foreground rounded-tl-md border border-border/50 shadow-lg",
              )}
            >
              {/* Subtle inner glow */}
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl opacity-50",
                  message.role === "user"
                    ? "bg-gradient-to-br from-white/10 to-transparent"
                    : "bg-gradient-to-br from-violet-500/5 to-transparent",
                )}
              />

              {/* Message content */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words relative z-10">{message.content}</p>

              {/* Enhanced Timestamp */}
              <div
                className={cn(
                  "text-xs mt-2 opacity-70 relative z-10 flex items-center gap-1",
                  message.role === "user" ? "text-emerald-100" : "text-muted-foreground",
                )}
              >
                <div className="w-1 h-1 rounded-full bg-current opacity-50" />
                {message.timestamp
                  ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

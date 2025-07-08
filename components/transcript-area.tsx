"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Bot,
  User,
  Sparkles,
  MessageSquare,
  UserCircle,
  Phone,
  PhoneOff,
  Camera,
  CameraOff,
  Loader2,
  Volume2,
} from "lucide-react"
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
  showTranscript: boolean
  onToggleView: () => void
  // New props for header controls
  isConnected?: boolean
  isLoading?: boolean
  isCameraEnabled?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onCameraToggle?: () => void
  currentState?: "idle" | "listening" | "processing" | "speaking" | "connecting"
}

export default function TranscriptArea({
  messages,
  showTranscript,
  onToggleView,
  isConnected = false,
  isLoading = false,
  isCameraEnabled = false,
  onConnect,
  onDisconnect,
  onCameraToggle,
  currentState = "idle",
}: TranscriptAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change - FIXED VERSION
  useEffect(() => {
    if (messagesEndRef.current && showTranscript) {
      // Use requestAnimationFrame to prevent layout thrashing
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "auto", // Changed from "smooth" to "auto" to prevent shake
            block: "end",
            inline: "nearest",
          })
        }
      })
    }
  }, [messages, showTranscript])

  // Inline Status Component for transcript
  const InlineStatus = ({ state }: { state: string }) => {
    if (state !== "processing" && state !== "speaking") return null

    const getStatusConfig = () => {
      switch (state) {
        case "processing":
          return {
            text: "Thinking...",
            icon: <Loader2 className="w-3 h-3 animate-spin" />,
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
          }
        case "speaking":
          return {
            text: "Responding...",
            icon: <Volume2 className="w-3 h-3 animate-pulse" />,
            color: "text-violet-400",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
          }
        default:
          return null
      }
    }

    const config = getStatusConfig()
    if (!config) return null

    return (
      <div className="flex items-start space-x-4 animate-in slide-in-from-bottom-2 duration-300 mb-6">
        {/* AI Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25">
          <Bot className="w-5 h-5 text-white" />
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
        </div>

        {/* Status bubble */}
        <div
          className={`rounded-2xl px-4 py-3 relative backdrop-blur-sm border rounded-tl-md ${config.bgColor} ${config.borderColor}`}
        >
          <div className="flex items-center gap-2">
            <div className={config.color}>{config.icon}</div>
            <p className={`text-sm font-medium ${config.color}`}>{config.text}</p>
          </div>
        </div>
      </div>
    )
  }

  const EmptyState = () => (
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
            {showTranscript ? (
              <MessageSquare className="w-10 h-10 text-white" />
            ) : (
              <UserCircle className="w-10 h-10 text-white" />
            )}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-500/20 animate-pulse" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-violet-400 animate-bounce" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-3">
          {showTranscript ? "Start a conversation" : "Avatar Mode"}
        </h3>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
          {showTranscript
            ? "Connect to the agent or type a message to begin your AI-powered conversation."
            : "Avatar mode coming soon! Switch back to transcript to see your conversation."}
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Modern Elegant Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-xl border-b border-border/50 relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/3 via-transparent to-cyan-500/3" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.08),transparent_70%)]" />

        <div className="flex items-center justify-between relative z-10">
          {/* Left side - Company Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-gray-900 font-bold text-lg">X</span>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 animate-pulse opacity-50" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-xs text-muted-foreground">
                {isConnected ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    Disconnected
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center - View Toggle */}
          <div className="flex items-center space-x-2 bg-muted/50 rounded-full p-1 border border-border/50">
            <button
              onClick={() => onToggleView()}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                showTranscript
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => onToggleView()}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                !showTranscript
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UserCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Avatar</span>
            </button>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-2">
            {/* Camera Button */}
            <button
              onClick={onCameraToggle}
              className={cn(
                "relative w-9 h-9 rounded-full transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 border",
                isCameraEnabled
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-500/20 shadow-blue-500/25"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border",
              )}
              title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isCameraEnabled ? <Camera className="w-4 h-4 mx-auto" /> : <CameraOff className="w-4 h-4 mx-auto" />}
            </button>

            {/* Call Button */}
            <button
              onClick={isConnected ? onDisconnect : onConnect}
              disabled={isLoading}
              className={cn(
                "relative w-9 h-9 rounded-full transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 border disabled:transform-none disabled:hover:scale-100",
                isConnected
                  ? "bg-gradient-to-br from-red-500 to-pink-500 text-white border-red-500/20 shadow-red-500/25 hover:from-red-600 hover:to-pink-600"
                  : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-emerald-500/20 shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600",
                isLoading && "from-gray-500 to-gray-600 border-gray-500/20",
              )}
              title={isConnected ? "Disconnect" : "Connect"}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : isConnected ? (
                <PhoneOff className="w-4 h-4 mx-auto" />
              ) : (
                <Phone className="w-4 h-4 mx-auto" />
              )}
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {!showTranscript ? (
        // Avatar Mode - Coming Soon
        <div className="flex-1 flex items-center justify-center p-8 relative bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none" />

          <div className="text-center relative z-10">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/25 relative">
                <UserCircle className="w-16 h-16 text-white" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
              </div>
              <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-violet-400 animate-bounce" />
            </div>
            <h3 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Avatar Mode
            </h3>
            <p className="text-lg text-muted-foreground/80 max-w-md mx-auto leading-relaxed mb-6">Coming Soon</p>
            <p className="text-sm text-muted-foreground/60 max-w-lg mx-auto leading-relaxed">
              Experience immersive AI conversations with a 3D avatar. Switch back to chat mode to see your current
              conversation.
            </p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <EmptyState />
      ) : (
        // Enhanced Messages with Custom Scrollbar
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm relative custom-scrollbar"
          style={{
            scrollBehavior: "auto", // Override smooth scrolling
            contain: "layout style", // Prevent layout shifts from affecting parent
          }}
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words relative z-10">
                  {message.content}
                </p>

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

          {/* Inline Status Display */}
          <InlineStatus state={currentState} />

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  )
}

"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">AI Voice Assistant</h3>
          <p className="text-sm text-gray-500">Connect to the agent and start speaking to see your conversation here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-gray-200">AI Voice Assistant</h2>
            <p className="text-xs text-gray-400">Live conversation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gray-950/20 backdrop-blur-sm"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #1f2937' }}
      >
        {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
              "flex items-start space-x-3",
              message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === "user" 
                  ? "bg-green-600" 
                  : "bg-blue-600"
              )}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 relative",
                message.role === "user"
                  ? "bg-green-600 text-white rounded-tr-md"
                  : "bg-gray-800 text-gray-100 rounded-tl-md border border-gray-700"
          )}
        >
              {/* Message content */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>

              {/* Timestamp */}
              <div
                className={cn(
                  "text-xs mt-1 opacity-70",
                  message.role === "user" ? "text-green-100" : "text-gray-400"
                )}
              >
                {message.timestamp 
                  ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              </div>
            </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

// Define the Message type here since we're not importing it
export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

interface TranscriptAreaProps {
  messages: Message[]
}

export default function TranscriptArea({ messages }: TranscriptAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
        No conversation history yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-4 pb-2 h-full overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "p-3 rounded-lg max-w-[85%]",
            message.role === "user" ? "bg-blue-100 dark:bg-blue-900/30 ml-auto" : "bg-gray-100 dark:bg-gray-800",
          )}
        >
          <p className="text-sm">{message.content}</p>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

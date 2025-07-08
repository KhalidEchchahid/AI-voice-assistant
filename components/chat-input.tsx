"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Send, Mic, MicOff, Paperclip, Smile, X, FileText, ImageIcon, File } from "lucide-react"
import { cn } from "@/lib/utils"

// Types for attachments
interface Attachment {
  id: string
  file: File
  type: "image" | "document" | "other"
  preview?: string
  name: string
  size: number
}

interface ChatInputProps {
  onSendMessage?: (message: string, attachments?: Attachment[]) => void
  onVoiceToggle?: () => void
  isVoiceActive?: boolean
  isConnected?: boolean
  disabled?: boolean
}

// Emoji data (simplified for demo)
const EMOJI_CATEGORIES = {
  Smileys: [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
  ],
  Gestures: [
    "👍",
    "👎",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👏",
    "🙌",
    "🤲",
    "🤝",
    "🙏",
  ],
  Objects: [
    "💻",
    "📱",
    "⌚",
    "📷",
    "📹",
    "🎥",
    "📞",
    "☎️",
    "📠",
    "📺",
    "📻",
    "🎵",
    "🎶",
    "🎤",
    "🎧",
    "📢",
    "📣",
    "📯",
    "🔔",
    "🔕",
    "📯",
    "🎺",
    "📻",
    "📱",
    "💻",
    "🖥️",
    "🖨️",
    "⌨️",
    "🖱️",
  ],
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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachments.length > 0) && onSendMessage) {
      onSendMessage(message.trim(), attachments)
      setMessage("")
      setAttachments([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    files.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      let type: "image" | "document" | "other" = "other"

      if (file.type.startsWith("image/")) {
        type = "image"
      } else if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text")) {
        type = "document"
      }

      const attachment: Attachment = {
        id,
        file,
        type,
        name: file.name,
        size: file.size,
      }

      // Create preview for images
      if (type === "image") {
        const reader = new FileReader()
        reader.onload = (e) => {
          setAttachments((prev) =>
            prev.map((att) => (att.id === id ? { ...att, preview: e.target?.result as string } : att)),
          )
        }
        reader.readAsDataURL(file)
      }

      setAttachments((prev) => [...prev, attachment])
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type === "image") return <ImageIcon className="w-4 h-4" />
    if (type === "document") return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-xl shadow-2xl z-50 max-h-64 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Emojis</h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto custom-scrollbar-small">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs text-muted-foreground mb-2">{category}</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-background border border-border rounded-lg p-2 flex items-center space-x-2 max-w-xs"
              >
                {attachment.type === "image" && attachment.preview ? (
                  <img
                    src={attachment.preview || "/placeholder.svg"}
                    alt={attachment.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    {getFileIcon(attachment.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                </div>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-xl border-t border-border/50 relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/2 via-transparent to-cyan-500/2" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),transparent_70%)]" />

        <form onSubmit={handleSubmit} className="relative z-10">
          <div
            className={cn(
              "flex items-end space-x-2 p-2.5 rounded-xl border transition-all duration-300 bg-background/80 backdrop-blur-sm",
              isFocused
                ? "border-violet-500/50 shadow-lg shadow-violet-500/10"
                : "border-border/50 hover:border-border/80",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
              title="Attach file"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
            />

            {/* Text Input */}
            <div className="flex-1 min-h-[36px] max-h-24 overflow-y-auto custom-scrollbar-small">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isConnected ? "Type a message..." : "Connect to start chatting..."}
                disabled={disabled}
                className="w-full resize-none bg-transparent border-none outline-none placeholder:text-muted-foreground/60 text-sm leading-relaxed disabled:cursor-not-allowed"
                rows={1}
                style={{
                  minHeight: "20px",
                  maxHeight: "72px",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className={cn(
                  "w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed",
                  showEmojiPicker
                    ? "bg-violet-500 text-white"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
                title="Add emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {/* Voice Button */}
              <button
                type="button"
                onClick={onVoiceToggle}
                disabled={disabled}
                className={cn(
                  "w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-sm",
                  isVoiceActive
                    ? "bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-red-500/25 hover:from-red-600 hover:to-pink-600"
                    : "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-violet-500/25 hover:from-violet-600 hover:to-purple-600",
                )}
                title={isVoiceActive ? "Stop recording" : "Start voice input"}
              >
                {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={disabled || (!message.trim() && attachments.length === 0)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center hover:scale-105 disabled:hover:scale-100 shadow-sm",
                  (message.trim() || attachments.length > 0) && !disabled
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

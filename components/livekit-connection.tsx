"use client"

import { useState, useEffect } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { ConnectionState } from "livekit-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wifi, WifiOff, Settings } from "lucide-react"

interface LiveKitConnectionProps {
  onConnectionChange: (connected: boolean) => void
}

export default function LiveKitConnection({ onConnectionChange }: LiveKitConnectionProps) {
  const { connect, disconnect, isConnected, connectionState, error } = useLiveKit()
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [roomName, setRoomName] = useState("voice-assistant-room")
  const [userName, setUserName] = useState("")

  // Generate token and connect
  const generateTokenAndConnect = async (room?: string, identity?: string, name?: string) => {
    try {
      setIsLoading(true)
      console.log("Generating LiveKit token...")

      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: room || roomName,
          identity: identity || `user_${Date.now()}`,
          name: name || userName || 'Voice Assistant User',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const { token, wsUrl, room: actualRoom, identity: actualIdentity } = await response.json()

      console.log("Token generated successfully, connecting to:", { wsUrl, actualRoom, actualIdentity })

      // Connect using the generated token
      await connect(wsUrl, token, false)
      
      console.log("Successfully connected to LiveKit!")
      setShowDialog(false)

    } catch (err) {
      console.error("Failed to generate token or connect:", err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      
      // Show error to user
      alert(`Connection failed: ${errorMessage}. Please check your environment variables.`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    onConnectionChange(isConnected)
  }, [isConnected, onConnectionChange])

  const handleManualConnect = async () => {
    await generateTokenAndConnect(roomName, undefined, userName)
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return "bg-green-500"
      case ConnectionState.Connecting:
        return "bg-yellow-500"
      case ConnectionState.Reconnecting:
        return "bg-orange-500"
      case ConnectionState.Disconnected:
      default:
        return "bg-gray-500"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return "Connected to agent"
      case ConnectionState.Connecting:
        return "Connecting to agent..."
      case ConnectionState.Reconnecting:
        return "Reconnecting..."
      case ConnectionState.Disconnected:
      default:
        return "Disconnected"
    }
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
        <span className="text-xs text-gray-400">{getConnectionStatusText()}</span>

        {isConnected ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleDisconnect}>
            <WifiOff className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Disconnect</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowDialog(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Settings</span>
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>LiveKit Connection Settings</DialogTitle>
            <DialogDescription>
              Configure connection to your LiveKit agent. Tokens are generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room-name" className="text-right">
                Room
              </Label>
              <Input
                id="room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="voice-assistant-room"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-name" className="text-right">
                Name
              </Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Voice Assistant User"
                className="col-span-3"
              />
            </div>

            <div className="text-sm text-blue-400 bg-blue-900/20 p-2 rounded-md">
              <strong>Environment Setup Required:</strong><br/>
              Make sure you have set these environment variables:<br/>
              • <code>LIVEKIT_API_KEY</code><br/>
              • <code>LIVEKIT_API_SECRET</code><br/>
              • <code>LIVEKIT_WS_URL</code>
            </div>

            {error && <div className="text-sm text-red-500 mt-2">Error: {error.message}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualConnect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : (
                "Connect Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

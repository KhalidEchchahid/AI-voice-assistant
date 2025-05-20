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
import { Loader2, Wifi, WifiOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface LiveKitConnectionProps {
  onConnectionChange: (connected: boolean) => void
}

export default function LiveKitConnection({ onConnectionChange }: LiveKitConnectionProps) {
  const { connect, disconnect, isConnected, connectionState, error } = useLiveKit()
  const [showDialog, setShowDialog] = useState(false)
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLocalDev, setIsLocalDev] = useState(false)

  useEffect(() => {
    // Only call the callback when the connection state actually changes
    onConnectionChange(isConnected)
  }, [isConnected, onConnectionChange])

  // Set default localhost URL when local dev mode is enabled
  useEffect(() => {
    if (isLocalDev && !url) {
      setUrl("ws://localhost:7880")
    }
  }, [isLocalDev, url])

  const handleConnect = async () => {
    if (!url) return
    if (!isLocalDev && !token) return

    setIsLoading(true)
    try {
      await connect(url, token, isLocalDev)
      setShowDialog(false)
    } catch (err) {
      console.error("Connection error:", err)
    } finally {
      setIsLoading(false)
    }
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
        return isLocalDev ? "Connected to local agent" : "Connected to agent"
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
        <span className="text-xs text-gray-500 dark:text-gray-400">{getConnectionStatusText()}</span>

        {isConnected ? (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleDisconnect}>
            <WifiOff className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Disconnect</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowDialog(true)}>
            <Wifi className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Connect</span>
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect to Agent</DialogTitle>
            <DialogDescription>
              Enter your LiveKit server URL and token to connect to your agent, or use local development mode.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="local-dev"
                checked={isLocalDev}
                onCheckedChange={(checked) => setIsLocalDev(checked === true)}
              />
              <Label
                htmlFor="local-dev"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Local Development Mode
              </Label>
            </div>

            {isLocalDev && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                Local mode connects to a LiveKit server running on your machine without requiring a token. Make sure
                your LiveKit server is running locally.
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="livekit-url" className="text-right">
                URL
              </Label>
              <Input
                id="livekit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={isLocalDev ? "ws://localhost:7880" : "wss://your-livekit-server.com"}
                className="col-span-3"
              />
            </div>

            {!isLocalDev && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="livekit-token" className="text-right">
                  Token
                </Label>
                <Input
                  id="livekit-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Your LiveKit token"
                  className="col-span-3"
                />
              </div>
            )}

            {error && <div className="text-sm text-red-500 mt-2">Error: {error.message}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!url || (!isLocalDev && !token) || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

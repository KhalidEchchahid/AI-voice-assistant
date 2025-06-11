"use client"

import { useState, useEffect } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import { ConnectionState } from "livekit-client"
import { Button } from "@/components/ui/button"
import { Loader2, Phone, PhoneOff, Volume2 } from "lucide-react"

interface AgentConnectionProps {
  onConnectionChange: (connected: boolean) => void
  className?: string
}

export default function AgentConnection({ onConnectionChange, className }: AgentConnectionProps) {
  const { connect, disconnect, isConnected, connectionState, error } = useLiveKit()
  const [isLoading, setIsLoading] = useState(false)
  const [audioTestPlaying, setAudioTestPlaying] = useState(false)

  // Test audio playback to ensure browser audio is working
  const testAudioPlayback = async () => {
    try {
      setAudioTestPlaying(true)
      console.log("Testing audio playback...")
      
      // Create a short beep sound to test audio
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
      
      setTimeout(() => {
        setAudioTestPlaying(false)
        audioContext.close()
      }, 400)
      
      console.log("Audio test completed")
    } catch (err) {
      console.error("Audio test failed:", err)
      setAudioTestPlaying(false)
      alert("Audio test failed. Please check your browser's audio permissions.")
    }
  }

  // Generate token and connect
  const generateTokenAndConnect = async () => {
    try {
      setIsLoading(true)
      console.log("Generating LiveKit token...")

      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: 'voice-assistant-room',
          identity: `user_${Date.now()}`,
          name: 'Voice Assistant User',
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

    } catch (err) {
      console.error("Failed to generate token or connect:", err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      
      // Show error to user
      alert(`Connection failed: ${errorMessage}. Please check your environment variables.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    await generateTokenAndConnect()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  useEffect(() => {
    onConnectionChange(isConnected)
  }, [isConnected, onConnectionChange])

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <Button 
            onClick={handleDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Call</span>
          </Button>
        ) : (
          <Button 
            onClick={handleConnect}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Connecting...' : 'Start Call'}</span>
          </Button>
        )}

        {/* Audio Test Button */}
        <Button 
          onClick={testAudioPlayback}
          disabled={audioTestPlaying}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          {audioTestPlaying ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
          <span className="text-xs">Test Audio</span>
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-400 text-center max-w-xs">
          Error: {error.message}
        </div>
      )}
      
      {!isConnected && (
        <div className="text-xs text-gray-400 text-center max-w-xs">
          Click "Test Audio" first to ensure audio is working
        </div>
      )}
    </div>
  )
}

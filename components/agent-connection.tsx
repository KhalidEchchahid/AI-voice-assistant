"use client"

import { useState, useEffect } from "react"
import { useLiveKit } from "@/components/livekit-provider"
import LiveKitConnection from "@/components/livekit-connection"
import LiveKitVideo from "@/components/livekit-video"
import RemoteParticipantVideo from "@/components/remote-participant-video"
import LocalDevGuide from "@/components/local-dev-guide"
import { cn } from "@/lib/utils"

interface AgentConnectionProps {
  onConnectionChange: (connected: boolean) => void
  className?: string
}

export default function AgentConnection({ onConnectionChange, className }: AgentConnectionProps) {
  const { isConnected, remoteParticipants } = useLiveKit()
  const [agentParticipant, setAgentParticipant] = useState<any>(null)

  useEffect(() => {
    // For simplicity, we'll assume the first remote participant is the agent
    if (remoteParticipants.size > 0) {
      const firstParticipant = Array.from(remoteParticipants.values())[0]
      // Only update if the participant has changed
      if (!agentParticipant || agentParticipant.identity !== firstParticipant.identity) {
        setAgentParticipant(firstParticipant)
      }
    } else if (agentParticipant) {
      setAgentParticipant(null)
    }
  }, [remoteParticipants, agentParticipant])

  useEffect(() => {
    onConnectionChange(isConnected)
  }, [isConnected, onConnectionChange])

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-between">
        <LiveKitConnection
          onConnectionChange={(connected) => {
            // Don't call onConnectionChange here, it's handled in the useEffect
          }}
        />
        <LocalDevGuide />
      </div>

      <div className="flex space-x-2">
        {isConnected && (
          <>
            <LiveKitVideo className="w-[120px] h-[90px]" />

            {agentParticipant && (
              <RemoteParticipantVideo participant={agentParticipant} className="w-[120px] h-[90px]" />
            )}
          </>
        )}
      </div>
    </div>
  )
}

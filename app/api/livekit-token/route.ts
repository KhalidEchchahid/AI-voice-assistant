import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'

export async function POST(request: NextRequest) {
  try {
    const { room, identity, name, agentName } = await request.json()

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('Missing LiveKit environment variables')
      return NextResponse.json(
        { error: 'LiveKit configuration missing' },
        { status: 500 }
      )
    }

    // Create access token with proper identity and metadata
    const userIdentity = identity || `user_${Math.random().toString(36).substr(2, 9)}`
    const userName = name || 'Voice Assistant User'
    const defaultAgentName = agentName || 'voice-assistant-agent'  // Default agent name
    
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userIdentity,
      name: userName,
      metadata: JSON.stringify({ 
        user_id: userIdentity,
        agent_requested: true,
        timestamp: Date.now()
      }),
    })

    // Grant permissions (including canUpdateOwnMetadata like playground)
    token.addGrant({
      room: room || 'voice-assistant-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    // FIXED: Enable agent dispatch configuration with proper RoomConfiguration
    console.log(`Configuring agent dispatch for agent: ${defaultAgentName}`)
    
    const roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: defaultAgentName,
          metadata: JSON.stringify({ 
            user_id: userIdentity,
            requested_at: Date.now(),
            source: 'frontend_token_request'
          }),
        }),
      ],
    })
    
    // Add room configuration to token
    token.roomConfig = roomConfig

    // Generate the token
    const jwt = await token.toJwt()

    console.log('Generated LiveKit token for:', { 
      room: room || 'voice-assistant-room', 
      identity: userIdentity, 
      name: userName,
      agentName: defaultAgentName,
      agentDispatch: true
    })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl,
      room: room || 'voice-assistant-room',
      identity: userIdentity,
      agentName: defaultAgentName,
    })

  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 
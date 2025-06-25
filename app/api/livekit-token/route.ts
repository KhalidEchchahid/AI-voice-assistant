import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
// Removed RoomAgentDispatch and RoomConfiguration for automatic dispatch
// import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'

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
    const roomName = room || 'voice-assistant-room'
    
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userIdentity,
      name: userName,
      metadata: JSON.stringify({ user_id: userIdentity }),
    })

    // Grant permissions (including canUpdateOwnMetadata like playground)
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    // REMOVED: Agent dispatch configuration for automatic dispatch mode
    // For automatic dispatch, agents will join automatically when room is created
    // No need to configure RoomAgentDispatch
    
    // Generate the token
    const jwt = await token.toJwt()

    console.log('Generated LiveKit token for automatic agent dispatch:', { 
      room: roomName, 
      identity: userIdentity, 
      name: userName,
      mode: 'automatic_dispatch'
    })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl,
      room: roomName,
      identity: userIdentity,
      mode: 'automatic_dispatch',
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
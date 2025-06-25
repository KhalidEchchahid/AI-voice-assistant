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
      console.error('Missing LiveKit environment variables', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl
      })
      return NextResponse.json(
        { error: 'LiveKit configuration missing' },
        { status: 500 }
      )
    }

    // Create access token with proper identity and metadata
    const userIdentity = identity || `user_${Math.random().toString(36).substr(2, 9)}`
    const userName = name || 'Voice Assistant User'
    const roomName = room || 'voice-assistant-room'
    const defaultAgentName = 'voice-assistant-agent' // This must match your entrypoint.py
    
    console.log('Generating token with configuration:', {
      roomName,
      userIdentity,
      userName,
      agentName: defaultAgentName,
      wsUrl: wsUrl.replace(/\/+$/, '') // Remove trailing slashes
    })

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userIdentity,
      name: userName,
      metadata: JSON.stringify({ 
        user_id: userIdentity,
        room: roomName,
        timestamp: Date.now()
      }),
    })

    // Grant comprehensive permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    // FIXED: Enable explicit agent dispatch - this ensures reliable agent joining
    // This configuration dispatches the agent when the participant connects
    token.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: defaultAgentName,
          metadata: JSON.stringify({ 
            user_id: userIdentity,
            room: roomName,
            timestamp: Date.now(),
            source: 'web-widget'
          }),
        }),
      ],
    })

    // Generate the token
    const jwt = await token.toJwt()

    console.log('✅ Successfully generated LiveKit token with agent dispatch:', { 
      room: roomName, 
      identity: userIdentity, 
      name: userName,
      agentName: defaultAgentName,
      tokenLength: jwt.length
    })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl.replace(/\/+$/, ''), // Clean URL
      room: roomName,
      identity: userIdentity,
      agentName: defaultAgentName,
      mode: 'explicit_dispatch'
    })

  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
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
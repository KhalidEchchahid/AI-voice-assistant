import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const { room, identity, name } = await request.json()

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_WS_URL

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('Missing LiveKit environment variables')
      return NextResponse.json(
        { error: 'LiveKit configuration missing' },
        { status: 500 }
      )
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: identity || `user_${Math.random().toString(36).substr(2, 9)}`,
      name: name || 'Voice Assistant User',
    })

    // Grant permissions
    token.addGrant({
      room: room || 'voice-assistant-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    // Generate the token
    const jwt = await token.toJwt()

    console.log('Generated LiveKit token for:', { room, identity, name })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl,
      room: room || 'voice-assistant-room',
      identity: identity || token.identity,
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
import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'
import type { AccessTokenOptions, VideoGrant } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const { room, identity, name, agentName } = await request.json()

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_URL

    console.log('🔧 Environment check:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasWsUrl: !!wsUrl,
      nodeEnv: process.env.NODE_ENV
    })

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('❌ Missing LiveKit environment variables', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl
      })
      return NextResponse.json(
        { error: 'LiveKit configuration missing - check environment variables' },
        { status: 500 }
      )
    }

    // Create access token with proper identity and metadata
    const userIdentity = identity || `user_${Math.random().toString(36).substr(2, 9)}`
    const userName = name || 'Voice Assistant User'
    const roomName = room || 'voice-assistant-room'
    const finalAgentName = agentName || 'voice-assistant-agent' // Use provided or default agent name
    
    console.log('🎯 Token generation configuration:', {
      roomName,
      userIdentity,
      userName,
      agentName: finalAgentName,
      dispatchMode: 'EXPLICIT',
      wsUrl: wsUrl.replace(/\/+$/, ''), // Remove trailing slashes
      timestamp: new Date().toISOString()
    })

    const userInfo: AccessTokenOptions = {
      identity: userIdentity,
      name: userName,
      metadata: JSON.stringify({ 
        user_id: userIdentity,
        room: roomName,
        timestamp: Date.now(),
        source: 'next-api-route'
      }),
    }

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    }

    const token = new AccessToken(apiKey, apiSecret, userInfo)
    token.addGrant(grant)

    // EXPLICIT DISPATCH MODE: Configure room with specific agent
    if (finalAgentName) {
      token.roomConfig = new RoomConfiguration({
        agents: [
          new RoomAgentDispatch({
            agentName: finalAgentName,
            metadata: JSON.stringify({ user_id: userIdentity }),
          }),
        ],
      })
      
      console.log('🔧 Explicit agent dispatch configured:', {
        agentName: finalAgentName,
        dispatchMode: 'EXPLICIT',
        roomConfig: 'configured'
      })
    }

    // Generate the token
    const jwt = await token.toJwt()

    console.log('✅ Successfully generated LiveKit token with explicit dispatch:', { 
      room: roomName, 
      identity: userIdentity, 
      name: userName,
      agentName: finalAgentName,
      dispatchMode: 'EXPLICIT',
      tokenLength: jwt.length,
      jwtPreview: jwt.substring(0, 50) + '...'
    })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl.replace(/\/+$/, ''), // Clean URL
      room: roomName,
      identity: userIdentity,
      agentName: finalAgentName,
      dispatchMode: 'EXPLICIT',
      debug: {
        timestamp: new Date().toISOString(),
        tokenGenerated: true,
        explicitDispatchEnabled: true,
        roomConfigSet: !!token.roomConfig
      }
    })

  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error)
    console.error('📍 Error stack trace:', (error as Error).stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate token', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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
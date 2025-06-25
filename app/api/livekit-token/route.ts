import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import type { AccessTokenOptions, VideoGrant } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    // Safely parse JSON with fallback for empty bodies
    let requestData: any = {}
    try {
      const body = await request.text()
      if (body.trim()) {
        requestData = JSON.parse(body)
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse request body, using defaults:', parseError)
      requestData = {}
    }
    
    const { room, identity, name, dispatchMode = 'auto' } = requestData

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_URL

    console.log('🔧 Environment check:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasWsUrl: !!wsUrl,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) || 'undefined',
      wsUrlValue: wsUrl || 'undefined',
      nodeEnv: process.env.NODE_ENV,
      envSource: 'process.env'
    })

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('❌ Missing LiveKit environment variables', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl
      })
      return NextResponse.json(
        { 
          error: 'LiveKit configuration missing',
          details: {
            apiKey: !apiKey ? 'Missing LIVEKIT_API_KEY' : 'Present',
            apiSecret: !apiSecret ? 'Missing LIVEKIT_API_SECRET' : 'Present',
            wsUrl: !wsUrl ? 'Missing LIVEKIT_URL' : 'Present'
          }
        },
        { status: 500 }
      )
    }

    // Validate API key format (should start with API)
    if (!apiKey.startsWith('API')) {
      console.error('❌ Invalid API key format. API key should start with "API"')
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 500 }
      )
    }

    // Generate unique identifiers
    const userIdentity = identity || `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
    const userName = name || 'Voice Assistant User'
    const roomName = room || `voice-assistant-room-${Date.now()}`
    
    console.log('🎯 Token generation configuration:', {
      roomName,
      userIdentity,
      userName,
      dispatchMode,
      wsUrl: wsUrl.replace(/\/+$/, ''),
      timestamp: new Date().toISOString()
    })

    const userInfo: AccessTokenOptions = {
      identity: userIdentity,
      name: userName,
      metadata: JSON.stringify({ 
        user_id: userIdentity,
        room: roomName,
        timestamp: Date.now(),
        source: 'next-api-route',
        dispatch_mode: dispatchMode
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

    // AUTO DISPATCH MODE: Don't set any room configuration
    // Let the agent worker automatically pick up the room
    if (dispatchMode === 'auto') {
      console.log('🔧 Auto dispatch mode: No explicit agent configuration')
      // Don't set any roomConfig for auto dispatch
    }

    // Generate the token
    const jwt = await token.toJwt()

    console.log('✅ Successfully generated LiveKit token:', { 
      room: roomName, 
      identity: userIdentity, 
      name: userName,
      dispatchMode,
      tokenLength: jwt.length,
      jwtPreview: jwt.substring(0, 50) + '...',
      success: true
    })

    return NextResponse.json({
      token: jwt,
      wsUrl: wsUrl.replace(/\/+$/, ''),
      room: roomName,
      identity: userIdentity,
      dispatchMode,
      debug: {
        timestamp: new Date().toISOString(),
        tokenGenerated: true,
        autoDispatchEnabled: dispatchMode === 'auto'
      }
    })

  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error)
    console.error('📍 Error stack trace:', (error as Error).stack)
    
    // Check for specific error types
    let errorMessage = 'Failed to generate token'
    if (error instanceof Error) {
      if (error.message.includes('Invalid key')) {
        errorMessage = 'Invalid LiveKit API key or secret'
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Network error - check LiveKit URL'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        troubleshooting: {
          apiKey: 'Ensure LIVEKIT_API_KEY starts with "API"',
          apiSecret: 'Ensure LIVEKIT_API_SECRET is correct',
          url: 'Ensure LIVEKIT_URL is reachable (e.g., wss://your-livekit-server.com)',
        }
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
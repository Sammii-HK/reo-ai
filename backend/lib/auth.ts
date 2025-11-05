import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase'

export async function verifyAuth(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    console.log('🔐 Auth check:', {
      hasHeader: !!authHeader,
      headerPreview: authHeader ? `${authHeader.substring(0, 30)}...` : 'none',
      method: request.method,
      url: request.url,
    })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ Missing or invalid authorization header')
      return {
        error: 'Missing or invalid authorization header',
        user: null,
      }
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token extracted:', {
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 20)}...`,
    })
    
    const supabase = createApiSupabaseClient()

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error) {
      console.error('❌ Supabase auth error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })
      return {
        error: `Invalid or expired token: ${error.message}`,
        user: null,
      }
    }

    if (!user) {
      console.error('❌ No user returned from Supabase')
      return {
        error: 'Invalid or expired token',
        user: null,
      }
    }

    console.log('✅ Auth successful:', {
      userId: user.id,
      email: user.email,
    })

    // Ensure user exists in our database (upsert)
    // This handles cases where user signed up directly with Supabase
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email || undefined, // Update email if it changed
        },
        create: {
          id: user.id,
          email: user.email || '',
        },
      })
    } catch (dbError: any) {
      console.error('⚠️ Failed to upsert user in database:', dbError)
      // Continue anyway - user is authenticated, we'll create record on first event
    }

    return {
      error: null,
      user,
    }
  } catch (error: any) {
    console.error('❌ Auth verification exception:', {
      message: error?.message,
      stack: error?.stack,
    })
    return {
      error: `Authentication failed: ${error?.message || 'Unknown error'}`,
      user: null,
    }
  }
}

export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const { user, error } = await verifyAuth(req)

    if (error || !user) {
      const errorResponse = NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
      // Add CORS headers even for errors
      errorResponse.headers.set('Access-Control-Allow-Origin', '*')
      errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      return errorResponse
    }

    const response = await handler(req, user.id)
    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
  }
}

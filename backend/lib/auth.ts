import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase'

export async function verifyAuth(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        error: 'Missing or invalid authorization header',
        user: null,
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createApiSupabaseClient()

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        error: 'Invalid or expired token',
        user: null,
      }
    }

    return {
      error: null,
      user,
    }
  } catch (error) {
    return {
      error: 'Authentication failed',
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

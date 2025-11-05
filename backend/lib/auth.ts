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
    const { user, error } = await verifyAuth(req)

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(req, user.id)
  }
}

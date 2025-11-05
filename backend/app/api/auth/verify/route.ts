import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

/**
 * GET /api/auth/verify
 * Verify a JWT token and return user info
 */
export async function GET(request: NextRequest) {
  const { user, error } = await verifyAuth(request)

  if (error || !user) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
  })
}

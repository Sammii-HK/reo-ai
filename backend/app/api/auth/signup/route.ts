import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { presetDomains } from '@/lib/seed'

/**
 * POST /api/auth/signup
 * Create a new user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, metadata } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createApiSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      )
    }

    // Create User record in our database
    try {
      const user = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
        },
      })

      // Create preset domains for new user
      const domainsToCreate = presetDomains.map((domain, index) => ({
        userId: user.id,
        name: domain.name,
        type: domain.type,
        enabled: index < 3, // Enable first 3 domains by default
        order: domain.order,
        icon: domain.icon,
        color: domain.color,
        schema: domain.schema,
      }))

      await prisma.domain.createMany({
        data: domainsToCreate,
      })
    } catch (dbError: any) {
      // If User already exists (e.g., from previous signup), that's okay
      if (!dbError.message?.includes('Unique constraint')) {
        console.error('Failed to create user record:', dbError)
      }
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { presetDomains } from '@/lib/seed'

/**
 * POST /api/domains/ensure
 * Ensure user has all preset domains (for existing users who signed up before domains were added)
 */
async function ensureDomainsHandler(req: NextRequest, userId: string) {
  try {
    // Ensure user exists first
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: '',
      },
    })

    // Check if user already has domains
    const existingDomains = await prisma.domain.findMany({
      where: { userId },
    })

    if (existingDomains.length > 0) {
      return NextResponse.json({
        message: 'Domains already exist',
        domains: existingDomains,
      })
    }

    // Create preset domains for user
    const domainsToCreate = presetDomains.map((domain, index) => ({
      userId,
      name: domain.name,
      type: domain.type,
      enabled: index < 3, // Enable first 3 by default
      order: domain.order,
      icon: domain.icon,
      color: domain.color,
      schema: domain.schema,
    }))

    const created = await prisma.domain.createMany({
      data: domainsToCreate,
    })

    const domains = await prisma.domain.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({
      message: 'Domains created',
      count: created.count,
      domains,
    })
  } catch (error: any) {
    console.error('Ensure domains error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to ensure domains' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(ensureDomainsHandler)


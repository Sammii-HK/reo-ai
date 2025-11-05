import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createDomainSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['PRESET', 'CUSTOM']).default('CUSTOM'),
  schema: z.record(z.any()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

async function getDomainsHandler(req: NextRequest, userId: string) {
  try {
    // User is already ensured by auth middleware
    // Use raw query with retry to avoid prepared statement conflicts
    let domains
    try {
      domains = await prisma.domain.findMany({
        where: { userId },
        orderBy: { order: 'asc' },
      })
    } catch (queryError: any) {
      // If prepared statement error, retry once
      if (queryError.message?.includes('prepared statement') || queryError.code === '42P05') {
        console.warn('Prepared statement conflict, retrying...')
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 100))
        domains = await prisma.domain.findMany({
          where: { userId },
          orderBy: { order: 'asc' },
        })
      } else {
        throw queryError
      }
    }

    return NextResponse.json({ domains })
  } catch (error: any) {
    console.error('Get domains error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get domains' },
      { status: 500 }
    )
  }
}

async function createDomainHandler(req: NextRequest, userId: string) {
  try {
    const body = await req.json()
    const { name, type, schema, icon, color } = createDomainSchema.parse(body)

    // Get current max order
    const maxOrder = await prisma.domain.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const domain = await prisma.domain.create({
      data: {
        userId,
        name,
        type,
        schema: schema || {},
        icon: icon,
        color: color,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ domain }, { status: 201 })
  } catch (error: any) {
    console.error('Create domain error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create domain' },
      { status: 500 }
    )
  }
}

const updateDomainSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  schema: z.record(z.any()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
})

async function updateDomainHandler(req: NextRequest, userId: string) {
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const domainId = pathSegments[pathSegments.length - 1]
    
    const body = await req.json()
    const data = updateDomainSchema.parse(body)

    const domain = await prisma.domain.updateMany({
      where: {
        id: domainId,
        userId, // Ensure user owns the domain
      },
      data,
    })

    if (domain.count === 0) {
      return NextResponse.json(
        { error: 'Domain not found or unauthorized' },
        { status: 404 }
      )
    }

    // Return updated domain
    const updated = await prisma.domain.findFirst({
      where: { id: domainId, userId },
    })

    return NextResponse.json({ domain: updated })
  } catch (error: any) {
    console.error('Update domain error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update domain' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getDomainsHandler)
export const POST = withAuth(createDomainHandler)


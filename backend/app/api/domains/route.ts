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
    const domains = await prisma.domain.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    })

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

export const GET = withAuth(getDomainsHandler)
export const POST = withAuth(createDomainHandler)


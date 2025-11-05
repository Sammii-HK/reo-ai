import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

    // Use retry for prepared statement conflicts
    let domain
    try {
      domain = await prisma.domain.updateMany({
        where: {
          id: domainId,
          userId, // Ensure user owns the domain
        },
        data,
      })
    } catch (queryError: any) {
      if (queryError.message?.includes('prepared statement') || queryError.code === '42P05') {
        console.warn('Prepared statement conflict, retrying...')
        await new Promise(resolve => setTimeout(resolve, 100))
        domain = await prisma.domain.updateMany({
          where: {
            id: domainId,
            userId,
          },
          data,
        })
      } else {
        throw queryError
      }
    }

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

export const PATCH = withAuth(updateDomainHandler)

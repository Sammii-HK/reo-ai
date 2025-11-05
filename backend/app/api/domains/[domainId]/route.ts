import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { retryQuery } from '@/lib/prisma-helper'
import { z } from 'zod'

const updateDomainSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  schema: z.record(z.any()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
})

async function getDomainDataHandler(req: NextRequest, userId: string) {
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const domainId = pathSegments[pathSegments.length - 1]
    
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get domain with retry
    const domain = await retryQuery(() =>
      prisma.domain.findFirst({
        where: {
          id: domainId,
          userId,
        },
      })
    )

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Get events for this domain
    const events = await retryQuery(() =>
      prisma.event.findMany({
        where: {
          userId,
          domain: domain.name,
        },
        orderBy: { ts: 'desc' },
        take: limit,
        skip: offset,
      })
    )

    // Get domain-specific logs based on domain name
    let domainLogs: any[] = []
    
    switch (domain.name) {
      case 'WELLNESS':
        domainLogs = await retryQuery(() =>
          prisma.wellnessLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'WORKOUT':
        domainLogs = await retryQuery(() =>
          prisma.workoutSet.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'HABIT':
        domainLogs = await retryQuery(() =>
          prisma.habitLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'JOBS':
        domainLogs = await retryQuery(() =>
          prisma.jobApplication.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'FINANCES':
        domainLogs = await retryQuery(() =>
          prisma.financeLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'LEARNING':
        domainLogs = await retryQuery(() =>
          prisma.learningLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'PRODUCTIVITY':
        domainLogs = await retryQuery(() =>
          prisma.productivityLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'HEALTH':
        domainLogs = await retryQuery(() =>
          prisma.healthLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'SOBRIETY':
        domainLogs = await retryQuery(() =>
          prisma.sobrietyLog.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
      case 'ROUTINE':
        domainLogs = await retryQuery(() =>
          prisma.routineCheck.findMany({
            where: { userId },
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
          })
        )
        break
    }

    return NextResponse.json({
      domain,
      events,
      logs: domainLogs,
      total: events.length + domainLogs.length,
    })
  } catch (error: any) {
    console.error('Get domain data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get domain data' },
      { status: 500 }
    )
  }
}

async function updateDomainHandler(req: NextRequest, userId: string) {
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const domainId = pathSegments[pathSegments.length - 1]
    
    const body = await req.json()
    const data = updateDomainSchema.parse(body)

    // Use retry for prepared statement conflicts
    const domain = await retryQuery(() =>
      prisma.domain.updateMany({
        where: {
          id: domainId,
          userId, // Ensure user owns the domain
        },
        data,
      })
    )

    if (domain.count === 0) {
      return NextResponse.json(
        { error: 'Domain not found or unauthorized' },
        { status: 404 }
      )
    }

    // Return updated domain with retry
    const updated = await retryQuery(() =>
      prisma.domain.findFirst({
        where: { id: domainId, userId },
      })
    )

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

export const GET = withAuth(getDomainDataHandler)
export const PATCH = withAuth(updateDomainHandler)

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getDomainDataHandler(req: NextRequest, userId: string, { params }: { params: { domainId: string } }) {
  try {
    const domainId = params.domainId
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get domain
    const domain = await prisma.domain.findFirst({
      where: {
        id: domainId,
        userId,
      },
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Get events for this domain
    const events = await prisma.event.findMany({
      where: {
        userId,
        domain: domain.name,
      },
      orderBy: { ts: 'desc' },
      take: limit,
      skip: offset,
    })

    // Get domain-specific logs based on domain name
    let domainLogs: any[] = []
    
    switch (domain.name) {
      case 'WELLNESS':
        domainLogs = await prisma.wellnessLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'WORKOUT':
        domainLogs = await prisma.workoutSet.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'HABIT':
        domainLogs = await prisma.habitLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'JOBS':
        domainLogs = await prisma.jobApplication.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'FINANCES':
        domainLogs = await prisma.financeLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'LEARNING':
        domainLogs = await prisma.learningLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'PRODUCTIVITY':
        domainLogs = await prisma.productivityLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'HEALTH':
        domainLogs = await prisma.healthLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'SOBRIETY':
        domainLogs = await prisma.sobrietyLog.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
      case 'ROUTINE':
        domainLogs = await prisma.routineCheck.findMany({
          where: { userId },
          orderBy: { ts: 'desc' },
          take: limit,
          skip: offset,
        })
        break
    }

    return NextResponse.json({
      domain,
      events,
      logs: domainLogs,
      total: events.length,
    })
  } catch (error: any) {
    console.error('Get domain data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get domain data' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getDomainDataHandler)


import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getSummaryHandler(req: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'daily' // daily | weekly

    const now = new Date()
    let startDate: Date
    let endDate = now

    if (period === 'daily') {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // Weekly - start from Monday
      startDate = new Date(now)
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Monday
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
    }

    // Get events for the period
    const events = await prisma.event.findMany({
      where: {
        userId,
        ts: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { ts: 'desc' },
      take: 100,
    })

    // Get domain-specific summaries
    const waterLogs = await prisma.wellnessLog.findMany({
      where: {
        userId,
        kind: 'WATER',
        ts: { gte: startDate, lte: endDate },
      },
    })

    const workoutSets = await prisma.workoutSet.findMany({
      where: {
        userId,
        ts: { gte: startDate, lte: endDate },
      },
    })

    const habits = await prisma.habitLog.findMany({
      where: {
        userId,
        ts: { gte: startDate, lte: endDate },
      },
    })

    // Generate summary text
    const summary = generateSummaryText(period, {
      events: events.length,
      water: waterLogs.reduce((sum, log) => sum + (log.value || 0), 0),
      workouts: workoutSets.length,
      habits: habits.length,
    })

    return NextResponse.json({
      summary,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics: {
        events: events.length,
        water: waterLogs.reduce((sum, log) => sum + (log.value || 0), 0),
        workouts: workoutSets.length,
        habits: habits.length,
      },
    })
  } catch (error: any) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

function generateSummaryText(
  period: string,
  metrics: { events: number; water: number; workouts: number; habits: number }
): string {
  const periodLabel = period === 'daily' ? 'today' : 'this week'
  
  const parts: string[] = []
  
  if (metrics.events > 0) {
    parts.push(`You logged ${metrics.events} ${metrics.events === 1 ? 'event' : 'events'} ${periodLabel}.`)
  }
  
  if (metrics.water > 0) {
    parts.push(`Drank ${metrics.water.toFixed(1)} ${metrics.water === 1 ? 'cup' : 'cups'} of water.`)
  }
  
  if (metrics.workouts > 0) {
    parts.push(`Completed ${metrics.workouts} ${metrics.workouts === 1 ? 'workout' : 'workouts'}.`)
  }
  
  if (metrics.habits > 0) {
    parts.push(`Checked off ${metrics.habits} ${metrics.habits === 1 ? 'habit' : 'habits'}.`)
  }
  
  if (parts.length === 0) {
    return `No activity logged ${periodLabel}. Start tracking by saying something like "drank 2 cups of water" or "did 5 squats at 100kg".`
  }
  
  return parts.join(' ')
}

export const GET = withAuth(getSummaryHandler)


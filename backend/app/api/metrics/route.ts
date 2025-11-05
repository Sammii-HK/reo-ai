import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getMetricsHandler(req: NextRequest, userId: string) {
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

    const { searchParams } = new URL(req.url)
    const domain = searchParams.get('domain') // Optional filter

    const now = new Date()
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const metrics: any[] = []

    // Water metrics
    if (!domain || domain === 'WELLNESS') {
      const waterLogs = await prisma.wellnessLog.findMany({
        where: {
          userId,
          kind: 'WATER',
          ts: { gte: startOfWeek },
        },
      })

      const weeklyWater = waterLogs.reduce((sum, log) => sum + (log.value || 0), 0)

      metrics.push({
        domain: 'WELLNESS',
        metricType: 'water_total',
        value: weeklyWater,
        period: 'week',
        label: 'Water (this week)',
        unit: 'cups',
      })
    }

    // Workout metrics
    if (!domain || domain === 'WORKOUT') {
      const workoutSets = await prisma.workoutSet.findMany({
        where: {
          userId,
          ts: { gte: startOfWeek },
        },
      })

      metrics.push({
        domain: 'WORKOUT',
        metricType: 'workouts_count',
        value: workoutSets.length,
        period: 'week',
        label: 'Workouts (this week)',
        unit: 'count',
      })
    }

    // Habit metrics
    if (!domain || domain === 'HABIT') {
      const habitLogs = await prisma.habitLog.findMany({
        where: {
          userId,
          ts: { gte: startOfWeek },
        },
      })

      metrics.push({
        domain: 'HABIT',
        metricType: 'habits_completed',
        value: habitLogs.length,
        period: 'week',
        label: 'Habits completed (this week)',
        unit: 'count',
      })
    }

    // Job application metrics
    if (!domain || domain === 'JOBS') {
      const jobApps = await prisma.jobApplication.findMany({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      })

      metrics.push({
        domain: 'JOBS',
        metricType: 'jobs_applied',
        value: jobApps.length,
        period: 'month',
        label: 'Job applications (this month)',
        unit: 'count',
      })
    }

    return NextResponse.json({ metrics })
  } catch (error: any) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get metrics' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getMetricsHandler)


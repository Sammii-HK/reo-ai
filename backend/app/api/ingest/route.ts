import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseInput } from '@/lib/nlu-parser'
import { z } from 'zod'

const ingestSchema = z.object({
  text: z.string().min(1).max(5000),
  source: z.enum(['CHAT', 'VOICE', 'API', 'IMPORT']).default('CHAT'),
})

// Note: OPTIONS is handled by withAuth wrapper, no need for separate handler

async function ingestHandler(req: NextRequest, userId: string) {
  try {
    const body = await req.json()
    const { text, source } = ingestSchema.parse(body)

    // Get user's existing domains for smart suggestions
    const userDomains = await prisma.domain.findMany({
      where: { userId },
      select: { name: true },
    })
    const domainNames = userDomains.map(d => d.name)

    // Parse the input
    const openaiKey = process.env.OPENAI_API_KEY
    const parseResult = await parseInput(text, openaiKey, domainNames)
    const { events, response, suggestedCategory } = parseResult

    // Create events in database
    const createdEvents = []
    for (const event of events) {
      // Create main Event record
      const eventRecord = await prisma.event.create({
        data: {
          userId,
          domain: event.domain,
          type: event.type,
          payload: event.payload,
          source,
          inputText: text,
          version: 1,
        },
      })

      // Create domain-specific log entries
      await createDomainLog(userId, event.domain, event.type, event.payload)

      createdEvents.push(eventRecord)
    }

    // CORS headers are added by withAuth wrapper
    return NextResponse.json({
      success: true,
      events: createdEvents,
      response,
      parsed: events.length > 0,
      suggestedCategory: suggestedCategory || undefined,
    })
  } catch (error: any) {
    console.error('Ingest error:', error)
    console.error('Error stack:', error.stack)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    // CORS headers are added by withAuth wrapper
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process input',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

async function createDomainLog(
  userId: string,
  domain: string,
  type: string,
  payload: Record<string, any>
) {
  try {
    switch (domain) {
      case 'WELLNESS':
        if (type === 'WATER_LOGGED') {
          await prisma.wellnessLog.create({
            data: {
              userId,
              kind: 'WATER',
              value: payload.amount,
              unit: payload.unit,
              meta: payload,
            },
          })
        } else if (type === 'SLEEP_LOGGED') {
          await prisma.wellnessLog.create({
            data: {
              userId,
              kind: 'SLEEP',
              value: payload.hours,
              unit: 'hours',
              meta: payload,
            },
          })
        } else if (type === 'MOOD_LOGGED') {
          await prisma.wellnessLog.create({
            data: {
              userId,
              kind: 'MOOD',
              value: payload.value,
              meta: { mood: payload.mood, ...payload },
            },
          })
        }
        break

      case 'WORKOUT':
        if (type === 'SET_COMPLETED') {
          await prisma.workoutSet.create({
            data: {
              userId,
              exercise: payload.exercise,
              weightKg: payload.unit === 'kg' ? payload.weight : payload.weight * 0.453592,
              reps: payload.reps,
              meta: payload,
            },
          })
        }
        break

      case 'HABIT':
        if (type === 'HABIT_COMPLETED') {
          await prisma.habitLog.create({
            data: {
              userId,
              habitId: payload.habitId,
              meta: { habit: payload.habit, ...payload },
            },
          })
        }
        break

      case 'JOBS': // Changed from CAREER to match preset domain
        if (type === 'JOB_APPLIED') {
          await prisma.jobApplication.create({
            data: {
              userId,
              company: payload.company,
              position: payload.position,
              status: payload.status || 'APPLIED',
              meta: payload,
            },
          })
        }
        break

      case 'FINANCES':
        if (type === 'EXPENSE_LOGGED' || type === 'INCOME_LOGGED') {
          await prisma.financeLog.create({
            data: {
              userId,
              category: payload.category,
              amount: payload.amount,
              type: payload.type,
              notes: payload.notes,
              meta: payload,
            },
          })
        }
        break

      case 'LEARNING':
        if (type === 'COURSE_STARTED' || type === 'COURSE_COMPLETED' || type === 'BOOK_READ') {
          // Extract type from event type (COURSE_STARTED -> COURSE, BOOK_READ -> BOOK)
          let learningType = payload.type
          if (!learningType) {
            if (type.startsWith('COURSE')) learningType = 'COURSE'
            else if (type.startsWith('BOOK')) learningType = 'BOOK'
            else if (type.startsWith('SKILL')) learningType = 'SKILL'
          }
          
          await prisma.learningLog.create({
            data: {
              userId,
              type: learningType || 'COURSE',
              title: payload.title || 'Untitled',
              progress: payload.progress,
              notes: payload.notes,
            },
          })
        }
        break

             case 'PRODUCTIVITY':
               if (type === 'TASK_COMPLETED' || type === 'POMODORO_COMPLETED' || type === 'FOCUS_SESSION' || type === 'PROJECT_COMPLETED') {
                 await prisma.productivityLog.create({
                   data: {
                     userId,
                     type: payload.type || type.replace('_COMPLETED', '').replace('_SESSION', ''),
                     duration: payload.duration,
                     notes: payload.notes || payload.description,
                     meta: payload,
                   },
                 })
               }
               break

      case 'HEALTH':
        if (type === 'SYMPTOM_LOGGED' || type === 'MEDICATION_TAKEN' || type === 'VITAL_LOGGED') {
          await prisma.healthLog.create({
            data: {
              userId,
              type: payload.type || type.replace('_LOGGED', '').replace('_TAKEN', ''),
              value: payload.value,
              unit: payload.unit,
              notes: payload.notes,
            },
          })
        }
        break

      case 'SOBRIETY':
        if (type === 'SOBRIETY_LOGGED') {
          await prisma.sobrietyLog.create({
            data: {
              userId,
              substance: payload.substance,
              status: payload.status,
              craving: payload.craving,
              notes: payload.notes,
            },
          })
        }
        break

      case 'ROUTINE':
        if (type === 'ROUTINE_CHECKED') {
          await prisma.routineCheck.create({
            data: {
              userId,
              routineId: payload.routineId || payload.routine_id,
              status: payload.status,
              notes: payload.notes,
            },
          })
        }
        break

      // Add more domain-specific logs as needed
    }
  } catch (error) {
    // Log error but don't fail the main request
    console.error(`Failed to create domain log for ${domain}/${type}:`, error)
  }
}

export const POST = withAuth(ingestHandler)


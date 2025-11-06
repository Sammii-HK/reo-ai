import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { retryQuery } from '@/lib/prisma-helper'
import { createApiSupabaseClient } from '@/lib/supabase'
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

    // User is already ensured by auth middleware
    // Get user's existing domains for smart suggestions (with retry)
    const userDomains = await retryQuery(() =>
      prisma.domain.findMany({
        where: { userId },
        select: { name: true },
      })
    )
    const domainNames = userDomains.map(d => d.name)

    // Parse the input using LLM-first parser
    const openaiKey = process.env.OPENAI_API_KEY
    const { parseInput } = await import('@/lib/nlu-parser')
    const parseResult = await parseInput(text, openaiKey, domainNames)
    const { events, response, suggestedCategory } = parseResult

    // Create events in database (skip incomplete ones - they're just prompts)
    const createdEvents = []
    for (const event of events) {
      try {
        // Skip incomplete events - they're just prompts for more info
        if (event.payload?.incomplete === true) {
          continue
        }

        // Create main Event record (with retry)
        const eventRecord = await retryQuery(() =>
          prisma.event.create({
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
        )

        // Create domain-specific log entries
        await createDomainLog(userId, event.domain, event.type, event.payload)

        createdEvents.push(eventRecord)
      } catch (eventError: any) {
        console.error(`Failed to create event for domain ${event.domain}:`, eventError)
        // Continue with other events even if one fails
      }
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
    // Ensure user exists (defensive check with retry)
    const user = await retryQuery(() =>
      prisma.user.findUnique({ where: { id: userId } })
    )
    if (!user) {
      console.error(`User ${userId} not found when creating domain log`)
      return
    }
    switch (domain) {
      case 'WELLNESS':
        if (type === 'WATER_LOGGED') {
          await retryQuery(() =>
            prisma.wellnessLog.create({
              data: {
                userId,
                kind: 'WATER',
                value: payload.amount,
                unit: payload.unit,
                meta: payload,
              },
            })
          )
        } else if (type === 'SLEEP_LOGGED') {
          await retryQuery(() =>
            prisma.wellnessLog.create({
              data: {
                userId,
                kind: 'SLEEP',
                value: payload.hours,
                unit: 'hours',
                meta: payload,
              },
            })
          )
        } else if (type === 'MOOD_LOGGED') {
          await retryQuery(() =>
            prisma.wellnessLog.create({
              data: {
                userId,
                kind: 'MOOD',
                value: payload.value,
                meta: { mood: payload.mood, ...payload },
              },
            })
          )
        }
        break

      case 'WORKOUT':
        if (type === 'SET_COMPLETED') {
          await retryQuery(() =>
            prisma.workoutSet.create({
              data: {
                userId,
                exercise: payload.exercise,
                weightKg: payload.unit === 'kg' ? payload.weight : payload.weight * 0.453592,
                reps: payload.reps,
                meta: payload,
              },
            })
          )
        }
        break

      case 'HABIT':
        if (type === 'HABIT_COMPLETED') {
          await retryQuery(() =>
            prisma.habitLog.create({
              data: {
                userId,
                habitId: payload.habitId,
                meta: { habit: payload.habit, ...payload },
              },
            })
          )
        }
        break

      case 'JOBS': // Changed from CAREER to match preset domain
        if (type === 'JOB_APPLIED') {
          // Only create if we have valid company name (not "Unknown")
          if (payload.company && payload.company !== 'Unknown' && payload.company !== 'To be determined') {
            await retryQuery(() =>
              prisma.jobApplication.create({
                data: {
                  userId,
                  company: payload.company,
                  role: payload.position || payload.role || undefined,
                  stage: payload.status || payload.stage || 'INTERESTED',
                  salary: payload.salary ? parseInt(payload.salary) : undefined,
                  notes: payload.notes,
                },
              })
            )
          }
          // Otherwise skip - incomplete data will be handled by response message
        } else if (type === 'JOB_FOUND' && !payload.incomplete) {
          // Only create if not marked as incomplete
          const count = payload.count || 1
          for (let i = 0; i < count; i++) {
            await retryQuery(() =>
              prisma.jobApplication.create({
                data: {
                  userId,
                  company: payload.company || 'To be determined',
                  role: payload.role || 'To be determined',
                  stage: 'INTERESTED',
                  notes: payload.notes || `Found ${count} job${count > 1 ? 's' : ''} to apply to`,
                },
              })
            )
          }
        }
        // Skip incomplete JOB_FOUND events - they're just prompts
        break

      case 'FINANCES':
        if (type === 'EXPENSE_LOGGED' || type === 'INCOME_LOGGED') {
          await retryQuery(() =>
            prisma.financeLog.create({
              data: {
                userId,
                category: payload.category || '',
                amount: payload.amount || 0,
                type: payload.type || 'EXPENSE',
                notes: payload.notes,
              },
            })
          )
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
          
          await retryQuery(() =>
            prisma.learningLog.create({
              data: {
                userId,
                type: learningType || 'COURSE',
                title: payload.title || 'Untitled',
                progress: payload.progress,
                notes: payload.notes,
              },
            })
          )
        }
        break

      case 'PRODUCTIVITY':
        if (type === 'TASK_COMPLETED' || type === 'POMODORO_COMPLETED' || type === 'FOCUS_SESSION' || type === 'PROJECT_COMPLETED') {
          await retryQuery(() =>
            prisma.productivityLog.create({
              data: {
                userId,
                type: payload.type || type.replace('_COMPLETED', '').replace('_SESSION', ''),
                duration: payload.duration,
                notes: payload.notes || payload.description,
              },
            })
          )
        }
        break

      case 'HEALTH':
        if (type === 'SYMPTOM_LOGGED' || type === 'MEDICATION_TAKEN' || type === 'VITAL_LOGGED') {
          await retryQuery(() =>
            prisma.healthLog.create({
              data: {
                userId,
                type: payload.type || type.replace('_LOGGED', '').replace('_TAKEN', ''),
                value: payload.value,
                unit: payload.unit,
                notes: payload.notes,
              },
            })
          )
        }
        break

      case 'SOBRIETY':
        if (type === 'SOBRIETY_LOGGED') {
          await retryQuery(() =>
            prisma.sobrietyLog.create({
              data: {
                userId,
                substance: payload.substance,
                status: payload.status,
                craving: payload.craving,
                notes: payload.notes,
              },
            })
          )
        }
        break

      case 'ROUTINE':
        if (type === 'ROUTINE_CHECKED') {
          await retryQuery(() =>
            prisma.routineCheck.create({
              data: {
                userId,
                routineId: payload.routineId || payload.routine_id,
                status: payload.status,
                notes: payload.notes,
              },
            })
          )
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


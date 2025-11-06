import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { retryQuery } from '@/lib/prisma-helper'
import { createApiSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

const ingestSchema = z.object({
  text: z.string().min(1).max(5000),
  source: z.enum(['CHAT', 'VOICE', 'API', 'IMPORT']).default('CHAT'),
  context: z.array(z.object({
    text: z.string(),
    isUser: z.boolean(),
  })).optional(), // Recent conversation history for context
})

// Note: OPTIONS is handled by withAuth wrapper, no need for separate handler

async function ingestHandler(req: NextRequest, userId: string) {
  try {
    const body = await req.json()
    const { text, source, context } = ingestSchema.parse(body)

    // User is already ensured by auth middleware
    // Get user's existing domains for smart suggestions (with retry)
    const userDomains = await retryQuery(() =>
      prisma.domain.findMany({
        where: { userId },
        select: { name: true },
      })
    )
    const domainNames = userDomains.map(d => d.name)

    // Get recent events for context (especially for follow-up messages like "5kg" or "i applied")
    let recentContext: any[] = []
    if (!context || context.length === 0) {
      // Fetch recent events from last 10 minutes to provide context
      const recentEvents = await retryQuery(() =>
        prisma.event.findMany({
          where: {
            userId,
            ts: {
              gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
            },
          },
          orderBy: { ts: 'desc' },
          take: 5, // Last 5 events (for better context)
        })
      )
      recentContext = recentEvents.map(e => ({
        text: e.inputText || '',
        isUser: true,
        domain: e.domain,
        type: e.type,
        payload: e.payload,
      }))
    } else {
      recentContext = context
    }

    // Parse the input using agent-based parser (function calling)
    const { parseInputWithAgent } = await import('@/lib/nlu-parser-agent')
    const parseResult = await parseInputWithAgent(text, userId)
    const { events, response, suggestedCategory, isQuery, queryType, queryDomain } = parseResult

    // Handle queries - fetch data from database and generate response with actual data
    if (isQuery) {
      let queryResponse = response // Default response
      let queryData: any = null

      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Handle domain-specific queries
        if (queryDomain === 'WELLNESS' || (queryType === 'stats' && (text.toLowerCase().includes('water') || text.toLowerCase().includes('sleep') || text.toLowerCase().includes('mood') || text.toLowerCase().includes('nutrition')))) {
          // WELLNESS queries
          if (text.toLowerCase().includes('water') || text.toLowerCase().includes('drink')) {
            const waterLogs = await retryQuery(() =>
              prisma.wellnessLog.findMany({
                where: {
                  userId,
                  kind: 'WATER',
                  ts: { gte: today },
                },
                orderBy: { ts: 'desc' },
              })
            )

            queryData = { waterLogs }
            if (waterLogs.length > 0) {
              let totalMl = 0
              waterLogs.forEach(log => {
                const value = log.value || 0
                const unit = (log.unit || 'ml').toLowerCase()
                if (unit === 'ml' || unit === 'milliliter') totalMl += value
                else if (unit === 'l' || unit === 'liter' || unit === 'liters') totalMl += value * 1000
                else if (unit === 'cup' || unit === 'cups') totalMl += value * 240
                else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') totalMl += value * 29.5735
                else totalMl += value
              })
              const totalLiters = (totalMl / 1000).toFixed(2)
              const totalCups = Math.round(totalMl / 240)
              queryResponse = `You've drunk ${totalMl.toFixed(0)} ml (${totalLiters} L / ${totalCups} cups) of water today across ${waterLogs.length} ${waterLogs.length === 1 ? 'entry' : 'entries'}. 💧`
            } else {
              queryResponse = "You haven't logged any water today yet. Try saying 'drank 500ml of water' to get started! 💧"
            }
          } else if (text.toLowerCase().includes('sleep')) {
            const sleepLogs = await retryQuery(() =>
              prisma.wellnessLog.findMany({
                where: {
                  userId,
                  kind: 'SLEEP',
                  ts: { gte: today },
                },
                orderBy: { ts: 'desc' },
                take: 7, // Last week
              })
            )

            queryData = { sleepLogs }
            if (sleepLogs.length > 0) {
              const totalHours = sleepLogs.reduce((sum, log) => sum + (log.value || 0), 0)
              const avgHours = (totalHours / sleepLogs.length).toFixed(1)
              queryResponse = `You've logged ${sleepLogs.length} sleep entries. Average: ${avgHours} hours per night. Last entry: ${sleepLogs[0].value || 0} hours. 😴`
            } else {
              queryResponse = "You haven't logged any sleep yet. Try saying 'slept 7 hours' to get started! 😴"
            }
          } else {
            // General wellness query
            const wellnessLogs = await retryQuery(() =>
              prisma.wellnessLog.findMany({
                where: { userId, ts: { gte: today } },
                orderBy: { ts: 'desc' },
                take: 10,
              })
            )
            queryData = { wellnessLogs }
            if (wellnessLogs.length > 0) {
              const logsText = wellnessLogs.slice(0, 5).map(log => {
                const date = new Date(log.ts).toLocaleTimeString()
                return `• ${log.kind}: ${log.value || 'N/A'} ${log.unit || ''} (${date})`
              }).join('\n')
              queryResponse = `Here's your wellness data today: 💧\n\n${logsText}`
            } else {
              queryResponse = "You haven't logged any wellness data today. Try logging water, sleep, or mood!"
            }
          }
        } else if (queryDomain === 'WORKOUT' || (queryType === 'stats' && (text.toLowerCase().includes('workout') || text.toLowerCase().includes('exercise') || text.toLowerCase().includes('gym')))) {
          // WORKOUT queries
          const workoutSets = await retryQuery(() =>
            prisma.workoutSet.findMany({
              where: { userId, ts: { gte: today } },
              orderBy: { ts: 'desc' },
              take: 50,
            })
          )

          queryData = { workoutSets }
          if (workoutSets.length > 0) {
            const exerciseCount = new Set(workoutSets.map(w => w.exercise)).size
            const totalSets = workoutSets.length
            const recentExercises = workoutSets.slice(0, 5).map(w => w.exercise).join(', ')
            queryResponse = `You've done ${totalSets} sets across ${exerciseCount} different exercises today. Recent: ${recentExercises}. 💪`
          } else {
            queryResponse = "You haven't logged any workouts today. Try saying 'did 5 squats at 100kg' to get started! 💪"
          }
        } else if (queryDomain === 'JOBS' || (queryType === 'stats' && (text.toLowerCase().includes('job') || text.toLowerCase().includes('application') || text.toLowerCase().includes('applied')))) {
          // JOBS queries
          const jobs = await retryQuery(() =>
            prisma.jobApplication.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          )

          queryData = { jobs }
          if (jobs.length > 0) {
            const byStage = jobs.reduce((acc, job) => {
              acc[job.stage] = (acc[job.stage] || 0) + 1
              return acc
            }, {} as Record<string, number>)

            const summary = Object.entries(byStage).map(([stage, count]) => `${stage}: ${count}`).join(', ')
            const recent = jobs.slice(0, 3).map(j => `${j.role} at ${j.company}`).join(', ')
            queryResponse = `You've applied to ${jobs.length} jobs. Status: ${summary}. Recent: ${recent}. 💼`
          } else {
            queryResponse = "You haven't logged any job applications yet. Try saying 'applied to Software Engineer at Google' to get started! 💼"
          }
        } else if (queryDomain === 'FINANCES' || (queryType === 'stats' && (text.toLowerCase().includes('money') || text.toLowerCase().includes('spent') || text.toLowerCase().includes('income') || text.toLowerCase().includes('expense')))) {
          // FINANCES queries
          const financeLogs = await retryQuery(() =>
            prisma.financeLog.findMany({
              where: { userId, ts: { gte: today } },
              orderBy: { ts: 'desc' },
              take: 50,
            })
          )

          queryData = { financeLogs }
          if (financeLogs.length > 0) {
            const expenses = financeLogs.filter(f => f.type === 'EXPENSE').reduce((sum, f) => sum + f.amount, 0)
            const income = financeLogs.filter(f => f.type === 'INCOME').reduce((sum, f) => sum + f.amount, 0)
            const net = income - expenses
            queryResponse = `Today's finances: Income: $${income.toFixed(2)}, Expenses: $${expenses.toFixed(2)}, Net: $${net.toFixed(2)}. Total entries: ${financeLogs.length}. 💰`
          } else {
            queryResponse = "You haven't logged any finances today. Try saying 'spent $50 on groceries' to get started! 💰"
          }
        } else if (queryDomain === 'LEARNING' || (queryType === 'stats' && (text.toLowerCase().includes('course') || text.toLowerCase().includes('book') || text.toLowerCase().includes('learn')))) {
          // LEARNING queries
          const learningLogs = await retryQuery(() =>
            prisma.learningLog.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 20,
            })
          )

          queryData = { learningLogs }
          if (learningLogs.length > 0) {
            const inProgress = learningLogs.filter(l => (l.progress || 0) < 100).length
            const completed = learningLogs.filter(l => (l.progress || 0) >= 100).length
            const recent = learningLogs.slice(0, 3).map(l => `${l.title} (${l.progress || 0}%)`).join(', ')
            queryResponse = `Learning progress: ${inProgress} in progress, ${completed} completed. Recent: ${recent}. 📚`
          } else {
            queryResponse = "You haven't logged any learning activities yet. Try saying 'started reading React Guide' to get started! 📚"
          }
        } else if (queryDomain === 'PRODUCTIVITY' || (queryType === 'stats' && (text.toLowerCase().includes('task') || text.toLowerCase().includes('pomodoro') || text.toLowerCase().includes('focus')))) {
          // PRODUCTIVITY queries
          const productivityLogs = await retryQuery(() =>
            prisma.productivityLog.findMany({
              where: { userId, ts: { gte: today } },
              orderBy: { ts: 'desc' },
              take: 50,
            })
          )

          queryData = { productivityLogs }
          if (productivityLogs.length > 0) {
            const totalMinutes = productivityLogs.reduce((sum, log) => sum + (log.duration || 0), 0)
            const totalHours = (totalMinutes / 60).toFixed(1)
            const tasks = productivityLogs.filter(l => l.type === 'TASK').length
            const pomodoros = productivityLogs.filter(l => l.type === 'POMODORO').length
            queryResponse = `Today's productivity: ${totalHours} hours focused, ${tasks} tasks, ${pomodoros} pomodoros. 🎯`
          } else {
            queryResponse = "You haven't logged any productivity today. Try saying 'completed 25 minute pomodoro' to get started! 🎯"
          }
        } else if (queryDomain === 'HEALTH' || (queryType === 'stats' && (text.toLowerCase().includes('health') || text.toLowerCase().includes('symptom') || text.toLowerCase().includes('medication')))) {
          // HEALTH queries
          const healthLogs = await retryQuery(() =>
            prisma.healthLog.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 20,
            })
          )

          queryData = { healthLogs }
          if (healthLogs.length > 0) {
            const byType = healthLogs.reduce((acc, log) => {
              acc[log.type] = (acc[log.type] || 0) + 1
              return acc
            }, {} as Record<string, number>)
            const summary = Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join(', ')
            queryResponse = `Health entries: ${summary}. Total: ${healthLogs.length}. 🏥`
          } else {
            queryResponse = "You haven't logged any health data yet. Try saying 'taking vitamin D supplement' to get started! 🏥"
          }
        } else if (queryDomain === 'SOBRIETY' || (queryType === 'stats' && (text.toLowerCase().includes('sober') || text.toLowerCase().includes('sobriety')))) {
          // SOBRIETY queries
          const sobrietyLogs = await retryQuery(() =>
            prisma.sobrietyLog.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 30,
            })
          )

          queryData = { sobrietyLogs }
          if (sobrietyLogs.length > 0) {
            const soberDays = sobrietyLogs.filter(l => l.status === 'sober').length
            const latest = sobrietyLogs[0]
            queryResponse = `Sobriety tracking: ${soberDays} sober days logged. Latest status: ${latest.status}. ${latest.status === 'sober' ? 'Keep it up! 🌱' : 'You\'ve got this! 🌱'}`
          } else {
            queryResponse = "You haven't logged any sobriety data yet. Try saying 'staying sober today' to get started! 🌱"
          }
        } else if (queryDomain === 'ROUTINE' || (queryType === 'stats' && text.toLowerCase().includes('routine'))) {
          // ROUTINE queries
          const routineChecks = await retryQuery(() =>
            prisma.routineCheck.findMany({
              where: { userId, ts: { gte: today } },
              orderBy: { ts: 'desc' },
              take: 20,
            })
          )

          queryData = { routineChecks }
          if (routineChecks.length > 0) {
            const completed = routineChecks.filter(r => r.status === 'completed').length
            const skipped = routineChecks.filter(r => r.status === 'skipped').length
            queryResponse = `Today's routines: ${completed} completed, ${skipped} skipped out of ${routineChecks.length} total. 🔄`
          } else {
            queryResponse = "You haven't logged any routines today. Try saying 'completed morning routine' to get started! 🔄"
          }
        } else if (queryType === 'goals' || queryDomain === 'HABIT') {
          // Fetch habit goals
          const goalEvents = await retryQuery(() =>
            prisma.event.findMany({
              where: {
                userId,
                domain: 'HABIT',
                type: 'HABIT_GOAL_SET',
              },
              orderBy: { ts: 'desc' },
              take: 10,
            })
          )

          // Also fetch habit completions to show progress
          const habitCompletions = await retryQuery(() =>
            prisma.habitLog.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 20,
            })
          )

          queryData = { goals: goalEvents, completions: habitCompletions }

          if (goalEvents.length > 0) {
            const goalsText = goalEvents.map(g => {
              const payload = g.payload as any
              const habit = payload?.habit || payload?.meta?.habit || 'unknown'
              const goal = payload?.goal || ''
              const timeline = payload?.timeline || ''
              const target = payload?.target || ''
              
              let goalText = `• **${habit}**`
              if (goal) goalText += ` - Goal: ${goal}`
              if (timeline) goalText += ` - Timeline: ${timeline}`
              if (target) goalText += ` - Target: ${target}`
              
              // Count completions for this habit
              const completions = habitCompletions.filter(c => {
                const meta = c.meta as any
                return (meta?.habit || '').toLowerCase() === habit.toLowerCase()
              })
              if (completions.length > 0) {
                goalText += ` (${completions.length} completions logged)`
              }
              
              return goalText
            }).join('\n')

            queryResponse = `Here are your habit goals: 🎯\n\n${goalsText}\n\nYou can view detailed progress in the Categories tab.`
          } else {
            queryResponse = "You don't have any habit goals set yet. Would you like to set one? For example: 'I want to quit smoking by the end of the month'"
          }
        } else if (queryType === 'habits') {
          // Fetch all habit completions
          const habits = await retryQuery(() =>
            prisma.habitLog.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 20,
            })
          )

          queryData = { habits }

          if (habits.length > 0) {
            const habitsText = habits.slice(0, 10).map(h => {
              const meta = h.meta as any
              const habit = meta?.habit || 'unknown'
              const date = new Date(h.ts).toLocaleDateString()
              return `• ${habit} - ${date}`
            }).join('\n')

            queryResponse = `Here are your recent habit completions: ✅\n\n${habitsText}\n\nYou can view all habits in the Categories tab.`
          } else {
            queryResponse = "You haven't logged any habit completions yet. Try saying something like 'quit smoking today' or 'did my exercise'."
          }
        } else if (queryType === 'stats') {
          // Handle stats queries (e.g., "how much water", "how much did i sleep")
          // Check if query is about water specifically
          if (text.toLowerCase().includes('water') || text.toLowerCase().includes('drink')) {
            // Get today's water logs
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const waterLogs = await retryQuery(() =>
              prisma.wellnessLog.findMany({
                where: {
                  userId,
                  kind: 'WATER',
                  ts: { gte: today },
                },
                orderBy: { ts: 'desc' },
              })
            )

            queryData = { waterLogs }

            if (waterLogs.length > 0) {
              // Calculate total in ml (convert all to ml first)
              let totalMl = 0
              waterLogs.forEach(log => {
                const value = log.value || 0
                const unit = (log.unit || 'ml').toLowerCase()
                
                if (unit === 'ml' || unit === 'milliliter') {
                  totalMl += value
                } else if (unit === 'l' || unit === 'liter' || unit === 'liters') {
                  totalMl += value * 1000
                } else if (unit === 'cup' || unit === 'cups') {
                  totalMl += value * 240 // Approximate: 1 cup = 240ml
                } else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
                  totalMl += value * 29.5735 // Approximate: 1 oz = 29.5735ml
                } else {
                  totalMl += value // Assume ml if unknown
                }
              })

              const totalLiters = (totalMl / 1000).toFixed(2)
              const totalCups = Math.round(totalMl / 240)
              const entryCount = waterLogs.length
              
              queryResponse = `You've drunk ${totalMl.toFixed(0)} ml (${totalLiters} L / ${totalCups} cups) of water today across ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}. 💧`
            } else {
              queryResponse = "You haven't logged any water today yet. Try saying 'drank 500ml of water' to get started! 💧"
            }
          } else {
            // General stats query - fetch recent events
            const recentEvents = await retryQuery(() =>
              prisma.event.findMany({
                where: { userId },
                orderBy: { ts: 'desc' },
                take: 10,
              })
            )

            queryData = { events: recentEvents }

            if (recentEvents.length > 0) {
              const eventsText = recentEvents.map(e => {
                const date = new Date(e.ts).toLocaleDateString()
                return `• ${e.domain} - ${e.type} (${date})`
              }).join('\n')

              queryResponse = `Here's what you've logged recently: 📊\n\n${eventsText}`
            } else {
              queryResponse = "You haven't logged anything yet. Start by saying something like 'drank 500ml of water' or 'did 5 squats'."
            }
          }
        } else if (queryType === 'recent') {
          // Fetch recent events
          const recentEvents = await retryQuery(() =>
            prisma.event.findMany({
              where: { userId },
              orderBy: { ts: 'desc' },
              take: 10,
            })
          )

          queryData = { events: recentEvents }

          if (recentEvents.length > 0) {
            const eventsText = recentEvents.map(e => {
              const date = new Date(e.ts).toLocaleDateString()
              return `• ${e.domain} - ${e.type} (${date})`
            }).join('\n')

            queryResponse = `Here's what you've logged recently: 📊\n\n${eventsText}`
          } else {
            queryResponse = "You haven't logged anything yet. Start by saying something like 'drank 500ml of water' or 'did 5 squats'."
          }
        }
      } catch (queryError: any) {
        console.error('Query error:', queryError)
        queryResponse = "I had trouble retrieving your data. Please try again or check the Categories tab."
      }

      return NextResponse.json({
        success: true,
        isQuery: true,
        queryType,
        queryDomain,
        data: queryData,
        response: queryResponse,
      })
    }

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
          // Convert weight to kg if needed
          let weightKg: number | null = null
          if (payload.weight != null && typeof payload.weight === 'number') {
            if (payload.unit === 'lbs' || payload.unit === 'pounds' || payload.unit === 'lb') {
              weightKg = payload.weight * 0.453592
            } else {
              // Default to kg if unit is 'kg' or undefined
              weightKg = payload.weight
            }
          }
          
          await retryQuery(() =>
            prisma.workoutSet.create({
              data: {
                userId,
                exercise: payload.exercise,
                weightKg: weightKg,
                reps: payload.reps || null,
                rpe: payload.rpe || null,
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


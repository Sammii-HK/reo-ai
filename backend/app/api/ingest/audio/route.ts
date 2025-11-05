import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { parseInput } from '@/lib/nlu-parser'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function ingestAudioHandler(req: NextRequest, userId: string) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert audio to base64 or use OpenAI Whisper API
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Convert File to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create FormData for OpenAI using multipart/form-data
    const FormData = require('form-data')
    const formDataForOpenAI = new FormData()
    formDataForOpenAI.append('file', buffer, {
      filename: audioFile.name || 'audio.webm',
      contentType: audioFile.type || 'audio/webm',
    })
    formDataForOpenAI.append('model', 'whisper-1')
    formDataForOpenAI.append('language', 'en')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        ...formDataForOpenAI.getHeaders(),
      },
      body: formDataForOpenAI,
    })

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text()
      console.error('Whisper API error:', error)
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      )
    }

    const whisperData = await whisperResponse.json()
    const text = whisperData.text

    if (!text) {
      return NextResponse.json(
        { error: 'No transcription returned' },
        { status: 500 }
      )
    }

    // Parse the transcribed text using the same NLU pipeline
    const { events, response } = await parseInput(text, openaiKey)

    // Create events in database
    const createdEvents = []
    for (const event of events) {
      const eventRecord = await prisma.event.create({
        data: {
          userId,
          domain: event.domain,
          type: event.type,
          payload: event.payload,
          source: 'VOICE',
          inputText: text,
          version: 1,
        },
      })

      // Create domain-specific log entries (same as text ingest)
      await createDomainLog(userId, event.domain, event.type, event.payload)

      createdEvents.push(eventRecord)
    }

    return NextResponse.json({
      success: true,
      events: createdEvents,
      response,
      parsed: events.length > 0,
      transcription: text,
    })
  } catch (error: any) {
    console.error('Audio ingest error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process audio' },
      { status: 500 }
    )
  }
}

// Helper function from ingest route
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
      case 'JOBS':
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
        if (type === 'TASK_COMPLETED' || type === 'POMODORO_COMPLETED' || type === 'FOCUS_SESSION') {
          await prisma.productivityLog.create({
            data: {
              userId,
              type: payload.type || type.replace('_COMPLETED', '').replace('_SESSION', ''),
              duration: payload.duration,
              notes: payload.notes,
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
    }
  } catch (error) {
    console.error(`Failed to create domain log for ${domain}/${type}:`, error)
  }
}

export const POST = withAuth(ingestAudioHandler)


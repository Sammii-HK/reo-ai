// Natural Language Understanding Parser
// Hybrid approach: Fast heuristics + LLM extraction

export interface ParsedEvent {
  domain: string
  type: string
  payload: Record<string, any>
  confidence: number
}

// Fast heuristic patterns (regex-based)
export function parseWithHeuristics(text: string): ParsedEvent | null {
  const lower = text.toLowerCase().trim()

  // Water intake patterns
  const waterMatch = lower.match(/(?:drank|drank|had|consumed)\s+(\d+(?:\.\d+)?)\s*(?:glasses?|cups?|liters?|l|ml|oz|ounces?|water)/)
  if (waterMatch) {
    const amount = parseFloat(waterMatch[1])
    const unit = lower.includes('ml') ? 'ml' : lower.includes('oz') || lower.includes('ounce') ? 'oz' : lower.includes('liter') || lower.includes('l') ? 'liter' : 'cups'
    return {
      domain: 'WELLNESS',
      type: 'WATER_LOGGED',
      payload: { amount, unit },
      confidence: 0.9,
    }
  }

  // Sleep patterns
  const sleepMatch = lower.match(/(?:slept|got|had)\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/)
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1])
    return {
      domain: 'WELLNESS',
      type: 'SLEEP_LOGGED',
      payload: { hours },
      confidence: 0.85,
    }
  }

  // Workout patterns
  const workoutMatch = lower.match(/(?:did|performed|completed|finished)\s+(\d+)\s*(?:reps?|repetitions?)\s+of\s+([a-z\s]+)\s+(?:at|with)\s+(\d+(?:\.\d+)?)\s*(?:kg|lbs?|pounds?)/i)
  if (workoutMatch) {
    const reps = parseInt(workoutMatch[1])
    const exercise = workoutMatch[2].trim()
    const weight = parseFloat(workoutMatch[3])
    const unit = lower.includes('kg') ? 'kg' : 'lbs'
    return {
      domain: 'WORKOUT',
      type: 'SET_COMPLETED',
      payload: { exercise, reps, weight, unit },
      confidence: 0.9,
    }
  }

  // Simple workout pattern: "squat 5x100kg"
  const simpleWorkoutMatch = lower.match(/([a-z]+)\s+(\d+)x(\d+(?:\.\d+)?)(kg|lbs?)/i)
  if (simpleWorkoutMatch) {
    const exercise = simpleWorkoutMatch[1].trim()
    const reps = parseInt(simpleWorkoutMatch[2])
    const weight = parseFloat(simpleWorkoutMatch[3])
    const unit = simpleWorkoutMatch[4] === 'kg' ? 'kg' : 'lbs'
    return {
      domain: 'WORKOUT',
      type: 'SET_COMPLETED',
      payload: { exercise, reps, weight, unit },
      confidence: 0.85,
    }
  }

  // Mood patterns
  const moodMatch = lower.match(/(?:feeling|feel|mood is|am|feels)\s+(?:really\s+|very\s+)?(?:happy|sad|anxious|stressed|calm|energetic|tired|excited|depressed|grateful|worried|confident)/i)
  if (moodMatch) {
    const mood = moodMatch[0].replace(/^(?:feeling|feel|mood is|am|feels)\s+(?:really\s+|very\s+)?/i, '').trim()
    const value = moodToValue(mood)
    return {
      domain: 'WELLNESS',
      type: 'MOOD_LOGGED',
      payload: { mood, value },
      confidence: 0.8,
    }
  }

  // Habit completion patterns
  const habitMatch = lower.match(/(?:completed|did|finished|checked off)\s+([a-z\s]+?)\s+(?:habit|today|off)/i)
  if (habitMatch) {
    const habit = habitMatch[1].trim()
    return {
      domain: 'HABIT',
      type: 'HABIT_COMPLETED',
      payload: { habit },
      confidence: 0.75,
    }
  }

  // Work/Productivity patterns - coding projects, building apps, working on tasks
  const workMatch = lower.match(/(?:worked|working|built|building|worked on|completed|finished)\s+(?:on\s+)?(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?|things)/i)
  if (workMatch) {
    const count = parseInt(workMatch[1])
    return {
      domain: 'PRODUCTIVITY',
      type: 'TASK_COMPLETED',
      payload: { 
        type: 'PROJECT',
        count,
        description: text,
      },
      confidence: 0.8,
    }
  }

  // Simple work pattern: "worked on 3 projects" or "3 coding projects"
  const simpleWorkMatch = lower.match(/(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?)/i)
  if (simpleWorkMatch && (lower.includes('work') || lower.includes('build') || lower.includes('code') || lower.includes('project'))) {
    const count = parseInt(simpleWorkMatch[1])
    return {
      domain: 'PRODUCTIVITY',
      type: 'TASK_COMPLETED',
      payload: { 
        type: 'PROJECT',
        count,
        description: text,
      },
      confidence: 0.75,
    }
  }

  // Job application patterns
  const jobMatch = lower.match(/(?:applied|submitted|sent)\s+(?:application|application)\s+(?:to|for|at)\s+([a-z\s]+?)(?:\s+for|$)/i)
  if (jobMatch) {
    const company = jobMatch[1].trim()
    return {
      domain: 'JOBS', // Match preset domain name
      type: 'JOB_APPLIED',
      payload: { company, status: 'APPLIED' },
      confidence: 0.8,
    }
  }

  return null
}

function moodToValue(mood: string): number {
  const moodMap: Record<string, number> = {
    happy: 8,
    excited: 9,
    grateful: 8,
    calm: 7,
    confident: 8,
    energetic: 7,
    tired: 4,
    sad: 3,
    anxious: 4,
    stressed: 3,
    worried: 4,
    depressed: 2,
  }
  return moodMap[mood.toLowerCase()] || 5
}

// LLM-based parsing (fallback when heuristics fail)
export async function parseWithLLM(
  text: string, 
  openaiKey?: string,
  existingDomains?: string[]
): Promise<{ events?: ParsedEvent[]; response?: string; suggestedCategory?: { name: string; reason: string } } | null> {
  if (!openaiKey) {
    console.warn('OpenAI API key not provided, skipping LLM parsing')
    return null
  }

  try {
    const domainList = existingDomains?.join(', ') || 'WELLNESS, WORKOUT, HABIT, JOBS, FINANCES, LEARNING, PRODUCTIVITY, HEALTH, SOBRIETY, ROUTINE'
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a natural language parser for a life tracking app. Extract structured data from user input.

Return JSON only with this exact structure:
{
  "domain": "WELLNESS" | "WORKOUT" | "HABIT" | "JOBS" | "FINANCES" | "LEARNING" | "PRODUCTIVITY" | "HEALTH" | "SOBRIETY" | "ROUTINE" | null,
  "type": "specific event type",
  "payload": { ... },
  "confidence": 0.0-1.0,
  "suggestedCategory": { "name": "CATEGORY_NAME", "reason": "why this category would be useful" } | null
}

Existing domains: ${domainList}

Domains and types:
- WELLNESS: WATER_LOGGED, SLEEP_LOGGED, MOOD_LOGGED, NUTRITION_LOGGED
- WORKOUT: SET_COMPLETED, WORKOUT_COMPLETED
- HABIT: HABIT_COMPLETED
- JOBS: JOB_APPLIED, JOB_INTERVIEW, JOB_OFFER
- FINANCES: EXPENSE_LOGGED, INCOME_LOGGED
- LEARNING: COURSE_STARTED, COURSE_COMPLETED, BOOK_READ
- PRODUCTIVITY: TASK_COMPLETED, POMODORO_COMPLETED, PROJECT_COMPLETED
- HEALTH: SYMPTOM_LOGGED, MEDICATION_TAKEN, VITAL_LOGGED
- SOBRIETY: SOBRIETY_LOGGED
- ROUTINE: ROUTINE_CHECKED

If the input doesn't fit any existing domain but is clearly trackable, set domain to null and provide suggestedCategory with a name and reason. Examples:
- "worked on 3 coding projects" → suggestedCategory: { "name": "PROJECTS", "reason": "tracking coding projects and development work" }
- "had 2 meetings today" → suggestedCategory: { "name": "WORK", "reason": "tracking work activities and meetings" }

If you can parse it into an existing domain, return domain and type. If not, return suggestedCategory.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    
    // If it suggests a new category
    if (parsed.suggestedCategory && !parsed.domain) {
      return {
        response: `I couldn't categorize that. Would you like to create a "${parsed.suggestedCategory.name}" category? This sounds like it could track ${parsed.suggestedCategory.reason}.`,
        suggestedCategory: parsed.suggestedCategory,
      }
    }
    
    // If it parsed into an existing domain
    if (parsed.domain && parsed.type && parsed.payload) {
      const event = parsed as ParsedEvent
      return {
        events: [event],
        response: generateConfirmation(event),
      }
    }

    return null
  } catch (error) {
    console.error('LLM parsing error:', error)
    return null
  }
}

// Main parsing function (hybrid approach)
export async function parseInput(
  text: string,
  openaiKey?: string,
  existingDomains?: string[]
): Promise<{ events: ParsedEvent[]; response: string; suggestedCategory?: { name: string; reason: string } }> {
  // Try heuristics first (fast)
  const heuristicResult = parseWithHeuristics(text)

  if (heuristicResult && heuristicResult.confidence > 0.7) {
    return {
      events: [heuristicResult],
      response: generateConfirmation(heuristicResult),
    }
  }

  // Fallback to LLM if heuristics fail
  if (openaiKey) {
    const llmResult = await parseWithLLM(text, openaiKey, existingDomains)
    if (llmResult) {
      return {
        events: llmResult.events || [],
        response: llmResult.response || '',
        suggestedCategory: llmResult.suggestedCategory,
      }
    }
  }

  // Analyze text for category suggestions
  const suggestedCategory = analyzeForCategorySuggestion(text)
  
  // No parseable content
  let response = "I couldn't understand that. Try something like 'drank 2 cups of water' or 'did 5 squats at 100kg'."
  
  if (suggestedCategory) {
    response = `I couldn't categorize that. Would you like to create a "${suggestedCategory.name}" category? This sounds like it could track ${suggestedCategory.reason}.`
  }

  return {
    events: [],
    response,
    suggestedCategory,
  }
}

function analyzeForCategorySuggestion(text: string): { name: string; reason: string } | undefined {
  const lower = text.toLowerCase()
  
  // Coding/development projects
  if (lower.match(/(?:coding|programming|building|developing|worked on|built)\s+(?:projects?|apps?|code|software)/)) {
    return {
      name: 'PROJECTS',
      reason: 'coding projects and development work',
    }
  }
  
  // Work/business
  if (lower.match(/(?:worked|working|business|work|meetings?|calls?)/)) {
    return {
      name: 'WORK',
      reason: 'work activities and business tasks',
    }
  }
  
  // Creative projects
  if (lower.match(/(?:creative|art|design|writing|music)/)) {
    return {
      name: 'CREATIVE',
      reason: 'creative projects and artistic work',
    }
  }
  
  return undefined
}

function generateConfirmation(event: ParsedEvent): string {
  const domainEmojis: Record<string, string> = {
    WELLNESS: '💧',
    WORKOUT: '💪',
    HABIT: '✅',
    JOBS: '💼',
    FINANCES: '💰',
    FINANCE: '💰',
    LEARNING: '📚',
    PRODUCTIVITY: '🎯',
    HEALTH: '🏥',
    SOBRIETY: '🌱',
    ROUTINE: '🔄',
  }

  const emoji = domainEmojis[event.domain] || '✨'
  
  switch (event.type) {
    case 'WATER_LOGGED':
      return `${emoji} Logged ${event.payload.amount} ${event.payload.unit} of water.`
    case 'SLEEP_LOGGED':
      return `${emoji} Logged ${event.payload.hours} hours of sleep.`
    case 'SET_COMPLETED':
      return `${emoji} Logged ${event.payload.reps} reps of ${event.payload.exercise} at ${event.payload.weight}${event.payload.unit}.`
    case 'MOOD_LOGGED':
      return `${emoji} Logged mood: ${event.payload.mood}.`
    case 'HABIT_COMPLETED':
      return `${emoji} Marked '${event.payload.habit}' as complete.`
    case 'JOB_APPLIED':
      return `${emoji} Logged job application to ${event.payload.company}.`
    case 'TASK_COMPLETED':
    case 'PROJECT_COMPLETED':
      const count = event.payload.count ? `${event.payload.count} ` : ''
      const type = event.payload.type || 'tasks'
      return `${emoji} Logged ${count}${type}. Great work!`
    default:
      return `${emoji} Logged ${event.type.toLowerCase().replace(/_/g, ' ')}.`
  }
}


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

  // Water intake patterns - more flexible
  const waterPatterns = [
    /(?:drank|drink|had|consumed)\s+(\d+(?:\.\d+)?)\s*(?:glasses?|cups?|liters?|l|ml|oz|ounces?|water)/i,
    /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|oz|ounces?|cups?|glasses?|liters?|l)\s*(?:of\s+)?(?:water|h2o)/i,
    /(?:drank|drink)\s+(\d+(?:\.\d+)?)/i, // Simple "drank 500" - assume ml if no unit
  ]
  
  for (const pattern of waterPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      let unit = 'cups' // default
      
      if (lower.includes('ml') || lower.includes('milliliter')) unit = 'ml'
      else if (lower.includes('oz') || lower.includes('ounce')) unit = 'oz'
      else if (lower.includes('liter') || (lower.includes('l') && !lower.includes('ml'))) unit = 'liter'
      else if (lower.includes('cup') || lower.includes('glass')) unit = 'cups'
      // If number is > 100 and no unit specified, assume ml
      else if (amount > 100 && !lower.match(/(?:cup|glass|liter|oz|ounce)/)) unit = 'ml'
      
      return {
        domain: 'WELLNESS',
        type: 'WATER_LOGGED',
        payload: { amount, unit },
        confidence: amount > 0 && amount < 10000 ? 0.9 : 0.7, // Lower confidence for unrealistic amounts
      }
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

  // Workout patterns - more flexible
  const workoutPatterns = [
    // "did 5 reps of squats at 100kg"
    /(?:did|performed|completed|finished)\s+(\d+)\s*(?:reps?|repetitions?)\s+(?:of\s+)?([a-z\s]+?)\s+(?:at|with|@)\s+(\d+(?:\.\d+)?)\s*(?:kg|lbs?|pounds?|lb)/i,
    // "squat 5x100kg" or "deadlift 3x150"
    /([a-z]+)\s+(\d+)x(\d+(?:\.\d+)?)\s*(kg|lbs?|lb)?/i,
    // "5 squats at 100kg"
    /(\d+)\s+([a-z]+)\s+(?:at|@|with)\s+(\d+(?:\.\d+)?)\s*(kg|lbs?|lb)/i,
    // "50 russian dead lifts" or "30 squats" - just reps, no weight
    /(\d+)\s+([a-z\s]+?)\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up)/i,
    // "ran 5km" or "ran for 30 minutes"
    /(?:ran|run|running)\s+(?:for\s+)?(\d+)\s*(?:km|kilometers?|miles?|minutes?|min|hours?|hrs?)/i,
  ]
  
  for (const pattern of workoutPatterns) {
    const match = lower.match(pattern)
    if (match) {
      // Check if it's a running/cardio pattern
      if (lower.includes('run') || lower.includes('ran')) {
        const value = parseFloat(match[1])
        const unit = lower.includes('km') || lower.includes('kilometer') ? 'km' : 
                     lower.includes('mile') ? 'miles' :
                     lower.includes('min') || lower.includes('minute') ? 'minutes' :
                     lower.includes('hour') || lower.includes('hr') ? 'hours' : 'km'
        return {
          domain: 'WORKOUT',
          type: 'WORKOUT_COMPLETED',
          payload: { 
            exercise: 'running',
            distance: unit.includes('km') || unit.includes('mile') ? value : undefined,
            duration: unit.includes('minute') || unit.includes('hour') ? value : undefined,
            unit,
          },
          confidence: 0.8,
        }
      }
      
      // Weight training patterns
      let reps: number | undefined
      let exercise: string | undefined
      let weight: number = 0
      const unit = lower.includes('kg') ? 'kg' : 'lbs'
      
      // Handle "50 russian dead lifts" pattern - just reps, no weight
      const repsOnlyMatch = lower.match(/(\d+)\s+([a-z\s]+?)\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up)/i)
      if (repsOnlyMatch && !lower.match(/at|with|@|\d+kg|\d+lbs/i)) {
        reps = parseInt(repsOnlyMatch[1])
        exercise = repsOnlyMatch[2].trim()
        // Extract exercise name from the full text
        const exerciseMatch = lower.match(/(?:russian|sumo|conventional|bulgarian)?\s*(?:deadlift|dead\s+lift|squat|bench|press|lunge|curl|extension|row|pull|push|fly|raise|crunch|sit-up|push-up|pull-up)/i)
        if (exerciseMatch) {
          exercise = exerciseMatch[0].trim()
        }
      } else {
        // Patterns with weight
        reps = parseInt(match[1] || match[2])
        exercise = (match[2] || match[1] || '').trim()
        weight = parseFloat(match[3] || match[2] || '0')
      }
      
      // If we have reps and exercise, log it (even without weight)
      if (exercise && reps && reps > 0) {
        return {
          domain: 'WORKOUT',
          type: weight > 0 ? 'SET_COMPLETED' : 'WORKOUT_COMPLETED',
          payload: weight > 0 
            ? { exercise: exercise.trim(), reps, weight, unit }
            : { exercise: exercise.trim(), reps, notes: text },
          confidence: 0.85,
        }
      }
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
  // More flexible patterns to catch "worked on more like 5 apps/coding projects"
  const workPatterns = [
    /(?:worked|working|built|building|completed|finished|improving|improved)\s+(?:on\s+)?(?:more\s+like\s+)?(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?|things)/i,
    /(\d+)\s*(?:coding\s+)?(?:projects?|apps?|tasks?)/i,
    /(?:did|completed|finished|worked on)\s+(?:more\s+like\s+)?(\d+)\s*(?:things?|items?|tasks?|projects?|apps?)/i,
    /(?:improving|improved|working on)\s+(?:my\s+)?(?:portfolio|code|projects?).*?(?:like\s+)?(\d+)/i,
  ]
  
  for (const pattern of workPatterns) {
    const match = lower.match(pattern)
    if (match && (lower.includes('work') || lower.includes('build') || lower.includes('code') || 
                  lower.includes('project') || lower.includes('app') || lower.includes('task') || 
                  lower.includes('portfolio') || lower.includes('improving'))) {
      const count = parseInt(match[1] || match[2] || match[3])
      if (count > 0) {
        return {
          domain: 'PRODUCTIVITY',
          type: 'PROJECT_COMPLETED',
          payload: { 
            type: 'PROJECT',
            count,
            description: text,
          },
          confidence: 0.8,
        }
      }
    }
  }

  // Job application patterns - more flexible
  const jobPatterns = [
    // "applied to company X" or "submitted application for Y"
    /(?:applied|submitted|sent)\s+(?:application|application)?\s*(?:to|for|at)\s+([a-z\s]+?)(?:\s+for|$)/i,
    // "finding jobs to apply to, i have 5 i need to apply to"
    /(?:finding|found|have|need|need to apply to)\s+(?:jobs?|positions?|applications?).*?(?:have|need|found)\s+(\d+)/i,
    // "i have 5 jobs to apply to" or "5 job applications"
    /(?:have|need|found|applying to)\s+(\d+)\s+(?:jobs?|positions?|applications?)(?:\s+to\s+(?:apply|apply to))?/i,
    // "found 5 job opportunities"
    /(?:found|have|discovered)\s+(\d+)\s+(?:job|position|opportunit)(?:ies|y)/i,
  ]
  
  for (const pattern of jobPatterns) {
    const match = lower.match(pattern)
    if (match && (lower.includes('job') || lower.includes('apply') || lower.includes('position') || lower.includes('application'))) {
      const count = match[1] ? parseInt(match[1]) : undefined
      const company = match[1] && !count ? match[1].trim() : undefined
      
      if (count && count > 0) {
        // Multiple jobs found/need to apply to
        return {
          domain: 'JOBS',
          type: 'JOB_FOUND',
          payload: { count, notes: text },
          confidence: 0.8,
        }
      } else if (company) {
        // Single job application
        return {
          domain: 'JOBS',
          type: 'JOB_APPLIED',
          payload: { company, status: 'APPLIED' },
          confidence: 0.8,
        }
      }
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
  
  // No parseable content - ask clarifying questions
  let response = "I'm not quite sure what you mean. Could you tell me more?"
  
  // Try to extract partial information and ask for clarification
  const lower = text.toLowerCase()
  
  if (lower.match(/(?:drank|drink|water|hydrated|liquid)/)) {
    response = "I heard something about water! How much did you drink? (e.g., '2 cups' or '500ml')"
  } else if (lower.match(/(?:worked|work|building|built|project|app|code)/)) {
    response = "Sounds like you did some work! What did you work on? (e.g., '3 coding projects' or 'built 2 apps')"
  } else if (lower.match(/(?:exercise|workout|gym|squat|deadlift|bench|lift|run|ran)/)) {
    response = "I heard something about exercise! What did you do? (e.g., 'did 5 squats at 100kg' or 'ran 5km')"
  } else if (lower.match(/(?:slept|sleep|bed|rest)/)) {
    response = "I heard something about sleep! How many hours did you sleep? (e.g., 'slept 7 hours')"
  } else if (lower.match(/(?:read|reading|book|pages)/)) {
    response = "I heard something about reading! What did you read? (e.g., 'read 50 pages' or 'finished a chapter')"
  } else if (lower.match(/(?:spent|bought|purchase|expense|money|cost)/)) {
    response = "I heard something about money! What did you spend? (e.g., 'spent $50 on groceries')"
  } else if (suggestedCategory) {
    response = `I couldn't categorize that. Would you like to create a "${suggestedCategory.name}" category? This sounds like it could track ${suggestedCategory.reason}.`
  } else {
    response = "I'm not sure how to track that. Could you give me more details? For example:\n• \"drank 2 cups of water\"\n• \"did 5 squats at 100kg\"\n• \"worked on 3 projects\"\n• \"slept 7 hours\""
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
      const waterAmount = event.payload.amount
      const waterUnit = event.payload.unit
      return `${emoji} Got it! Logged ${waterAmount} ${waterUnit} of water. Keep it up!`
    case 'SLEEP_LOGGED':
      return `${emoji} Logged ${event.payload.hours} hours of sleep. Rest well!`
    case 'SET_COMPLETED':
      return `${emoji} Nice! Logged ${event.payload.reps} reps of ${event.payload.exercise} at ${event.payload.weight}${event.payload.unit}.`
    case 'WORKOUT_COMPLETED':
      if (event.payload.distance) {
        return `${emoji} Great run! Logged ${event.payload.distance} ${event.payload.unit}.`
      } else if (event.payload.duration) {
        return `${emoji} Good workout! Logged ${event.payload.duration} ${event.payload.unit} of running.`
      }
      return `${emoji} Logged your workout.`
    case 'MOOD_LOGGED':
      return `${emoji} Noted you're feeling ${event.payload.mood}. Thanks for sharing!`
    case 'HABIT_COMPLETED':
      return `${emoji} Marked '${event.payload.habit}' as complete. Keep it up!`
    case 'JOB_APPLIED':
      return `${emoji} Logged job application to ${event.payload.company}. Good luck!`
    case 'TASK_COMPLETED':
    case 'PROJECT_COMPLETED':
      const count = event.payload.count ? `${event.payload.count} ` : ''
      const type = event.payload.type || 'tasks'
      return `${emoji} Nice work! Logged ${count}${type}.`
    default:
      return `${emoji} Got it! I've logged that for you.`
  }
}


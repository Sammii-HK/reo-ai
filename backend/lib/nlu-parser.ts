// LLM-First Natural Language Understanding Parser
// This version relies primarily on OpenAI with full schema context

export interface ParsedEvent {
  domain: string
  type: string
  payload: Record<string, any>
  confidence: number
}

// Extract job details from URL (helper function)
async function extractJobFromUrl(url: string): Promise<{ company?: string; role?: string }> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    
    // Extract company from hostname (e.g., vercel.com -> Vercel)
    const company = hostname.split('.')[0]
    const companyName = company.charAt(0).toUpperCase() + company.slice(1)
    
    // Extract role from path (e.g., /careers/product-engineer -> "Product Engineer")
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    let role: string | undefined
    
    // Look for common job-related paths
    const careersIndex = pathParts.findIndex(p => p.toLowerCase().includes('career') || p.toLowerCase().includes('job'))
    if (careersIndex >= 0 && pathParts[careersIndex + 1]) {
      let rolePart = pathParts[careersIndex + 1]
      // Remove trailing numeric IDs (like -5466858004)
      rolePart = rolePart.replace(/-\d+$/, '')
      // Convert to readable format
      role = rolePart
        .split('-')
        .map(word => {
          // Handle version numbers like "v0" -> "V0"
          if (word.match(/^v\d+$/i)) {
            return word.toUpperCase()
          }
          return word.charAt(0).toUpperCase() + word.slice(1)
        })
        .join(' ')
    } else if (pathParts.length > 0) {
      let lastPart = pathParts[pathParts.length - 1]
      // Remove trailing numeric IDs
      lastPart = lastPart.replace(/-\d+$/, '')
      if (lastPart && !lastPart.match(/^\d+$/)) {
        role = lastPart
          .split('-')
          .map(word => {
            if (word.match(/^v\d+$/i)) {
              return word.toUpperCase()
            }
            return word.charAt(0).toUpperCase() + word.slice(1)
          })
          .join(' ')
      }
    }
    
    return { company: companyName, role }
  } catch (e) {
    return {}
  }
}

// Extract URL from text
function extractUrl(text: string): string | undefined {
  const match = text.match(/(https?:\/\/[^\s]+)/i)
  return match ? match[1] : undefined
}

// Load comprehensive ChatGPT context (will be read at runtime)
import * as fs from 'fs'
import * as path from 'path'

const chatgptContextPath = path.join(process.cwd(), 'backend/lib/chatgpt-context.md')
let chatgptContext = ''
try {
  chatgptContext = fs.readFileSync(chatgptContextPath, 'utf-8')
} catch (e) {
  console.warn('Could not read chatgpt-context.md, using minimal context')
  chatgptContext = 'Please refer to comprehensive context document for full domain schemas and patterns.'
}

// Full database schema context for LLM
const DATABASE_SCHEMA = `
DATABASE SCHEMA:
This is a life tracking application with the following structure:

1. Event (Main event log):
   - domain: string (e.g., "WELLNESS", "WORKOUT", "JOBS")
   - type: string (e.g., "WATER_LOGGED", "SET_COMPLETED", "JOB_APPLIED")
   - payload: JSON object with domain-specific data
   - ts: timestamp

2. Domain-Specific Tables (created from events):

   HabitLog:
   - habitId: string? (optional habit identifier)
   - value: number? (optional numeric value)
   - unit: string? (optional unit)
   - meta: JSON? (stores habit name in meta.habit)

   WellnessLog:
   - kind: "WATER" | "SLEEP" | "MOOD" | "NUTRITION"
   - value: number?
   - unit: string?
   - meta: JSON?

   WorkoutSet:
   - exercise: string (required)
   - weightKg: number?
   - reps: number?
   - rpe: number? (1-10, Rate of Perceived Exertion)
   - meta: JSON?

   JobApplication:
   - company: string (required)
   - role: string (required)
   - stage: "Applied" | "Screen" | "Interview" | "Offer" | "Rejected" | "Hold"
   - salary: number?
   - notes: string?
   - ts: timestamp

   FinanceLog:
   - category: string?
   - amount: number (required)
   - type: "INCOME" | "EXPENSE"
   - notes: string?

   LearningLog:
   - type: "COURSE" | "BOOK" | "SKILL"
   - title: string (required)
   - progress: number? (0-100)
   - notes: string?

   ProductivityLog:
   - type: "TASK" | "POMODORO" | "FOCUS"
   - duration: number? (minutes)
   - notes: string?

   HealthLog:
   - type: "SYMPTOM" | "MEDICATION" | "VITAL"
   - value: number?
   - unit: string?
   - notes: string?

   SobrietyLog:
   - substance: string?
   - status: "sober" | "craving" | "relapsed"
   - craving: number? (1-10 scale)
   - notes: string?

   RoutineCheck:
   - routineId: string?
   - status: "completed" | "skipped" | "partial"
   - notes: string?
`

const DOMAIN_SCHEMAS = `
DOMAIN SCHEMAS (from presetDomains):

HABIT:
  Fields: { id: "habit_id", name: "Habit", type: "text", required: true }
  Common habits: quit smoking, eat healthy, drink water, exercise, meditate, journal, read, walk, yoga, stretch
  Normalize habit names (e.g., "quitting smoking" -> "quit smoking", "eating healthier" -> "eat healthy")

WELLNESS:
  Fields: { id: "kind", options: ["WATER", "SLEEP", "MOOD", "NUTRITION"], required: true }
  For WATER: amount (number), unit ("ml"|"cups"|"oz"|"liters")
  For SLEEP: hours (number)
  For MOOD: mood (string), value (1-10 number)

WORKOUT:
  Fields: { id: "exercise", required: true }, weight_kg, reps, rpe (1-10)
  Always include exercise name

JOBS:
  Fields: company (required), role (required), stage (required), salary (optional), notes (optional)
  Stages: "Applied", "Screen", "Interview", "Offer", "Rejected", "Hold"
  Extract company from URL hostname (e.g., vercel.com -> "Vercel")
  Extract role from URL path (e.g., /careers/product-engineer -> "Product Engineer")
  When URL provided, ALWAYS extract what you can and include in payload

FINANCES:
  Fields: category (optional), amount (required), type: "INCOME"|"EXPENSE", notes (optional)
  Extract currency from symbols ($=USD, £=GBP, €=EUR, ¥=JPY)

LEARNING:
  Fields: type: "COURSE"|"BOOK"|"SKILL", title (required), progress (0-100), notes (optional)

PRODUCTIVITY:
  Fields: type: "TASK"|"POMODORO"|"FOCUS", duration (minutes, optional), notes (optional)

HEALTH:
  Fields: type: "SYMPTOM"|"MEDICATION"|"VITAL", value (optional), unit (optional), notes (optional)

SOBRIETY:
  Fields: substance (optional), status: "sober"|"craving"|"relapsed" (required), craving (1-10, optional), notes (optional)

ROUTINE:
  Fields: routineId (optional), status: "completed"|"skipped"|"partial" (required), notes (optional)
`

// Main LLM-based parser with full context
export async function parseInput(
  text: string,
  openaiKey?: string,
  existingDomains?: string[],
  conversationContext?: any[] // Recent messages/events for context
): Promise<{ events: ParsedEvent[]; response: string; suggestedCategory?: { name: string; reason: string } }> {
  if (!openaiKey) {
    return {
      events: [],
      response: "I need an OpenAI API key to understand your input. Please configure it in the backend.",
    }
  }

  // Check for job URLs first and extract details
  const urlMatch = extractUrl(text)
  let urlExtracted: { company?: string; role?: string } | null = null
  
  if (urlMatch && text.toLowerCase().match(/(?:job|apply|position|career|role)/)) {
    urlExtracted = await extractJobFromUrl(urlMatch)
  }

  const domainList = existingDomains?.join(', ') || 'WELLNESS, WORKOUT, HABIT, JOBS, FINANCES, LEARNING, PRODUCTIVITY, HEALTH, SOBRIETY, ROUTINE'

  // Build enhanced prompt with extracted URL info and conversation context
  let enhancedText = text
  let contextInfo = ''
  
  if (urlExtracted && (urlExtracted.company || urlExtracted.role)) {
    enhancedText = `${text}\n\n[Extracted from URL: Company: ${urlExtracted.company || 'unknown'}, Role: ${urlExtracted.role || 'unknown'}]`
  }
  
  // Add conversation context for follow-up messages
  if (conversationContext && conversationContext.length > 0) {
    const recentMessages = conversationContext
      .slice(0, 3) // Last 3 messages
      .map((ctx, i) => {
        if (ctx.domain && ctx.type) {
          // This is an event - provide structured context
          const payloadSummary = Object.entries(ctx.payload || {})
            .filter(([k, v]) => k !== 'incomplete' && v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
          return `Previous: "${ctx.text}" → ${ctx.domain}/${ctx.type} (${payloadSummary})`
        }
        return `Previous: "${ctx.text}"`
      })
      .join('\n')
    
    contextInfo = `\n\nCONVERSATION CONTEXT (in chronological order, most recent last):\n${recentMessages}\n\nCRITICAL RULES FOR FOLLOW-UPS:
- If current input is a follow-up (like "5kg" after a workout, or "i applied to the v0 role" after a job mention), MERGE it with the previous context
- If previous context mentions a job/company/role, and current input mentions "applied", "v0 role", or similar, combine them into one complete JOB_APPLIED event
- If previous context is a workout without weight, and current is just a weight ("5kg"), combine them
- DO NOT create incomplete events when you have enough context from previous messages
- Extract ALL fields from the combined context to create a complete event`
  }

  try {
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
            content: `You are an expert natural language parser for a comprehensive life tracking application. Your job is to extract structured data from user input and map it to the correct domain and event type.

${chatgptContext}

${DATABASE_SCHEMA}

${DOMAIN_SCHEMAS}

EXISTING DOMAINS: ${domainList}
${contextInfo}

INSTRUCTIONS (Use the comprehensive context above to guide your decisions):
1. Analyze the user's input carefully and extract ALL relevant information
2. **DISTINGUISH INTENT vs COMPLETION**:
   - "I quit smoking" / "I stopped smoking" = COMPLETED (HABIT_COMPLETED)
   - "I want to quit smoking" / "I'm trying to quit smoking" / "I am trying to quit" = GOAL SETTING (HABIT_GOAL_SET)
   - For goal setting, DO NOT create an event - instead return a response asking about goals, timelines, targets
3. Map to the correct domain based on the DATABASE SCHEMA and DOMAIN SCHEMAS above
4. Extract ALL fields required by the domain schema
5. For URLs: Extract company from hostname, role from path segments (especially after /careers/, /jobs/, /positions/)
   - Remove trailing numeric IDs from role names (e.g., "product-engineer-v0-5466858004" -> "Product Engineer V0")
6. Normalize units (convert to standard: ml, cups, oz, liters for water; hours for sleep; kg for weight)
7. Normalize habit names (e.g., "quitting smoking" -> "quit smoking")
8. Extract numbers, dates, times, currencies from text
9. If information is incomplete, set incomplete: true and ask for clarification
10. **CRITICAL - FOLLOW-UP MESSAGES**: 
    - If CONVERSATION CONTEXT shows a previous message, check if current input is a follow-up
    - Examples of follow-ups:
      * "5kg" after "did 50 russian deadlifts" → combine into complete workout with weight
      * "i applied to the v0 role" after job mention → merge with previous job context
      * "at Google" after "i want to apply" → combine company with previous intent
    - When merging, use ALL information from both previous context AND current input
    - DO NOT ask for more info if you have enough from context to create complete event
11. For job roles: Do NOT include numeric IDs or timestamps in the role name - clean them out (e.g., "product-engineer-v0-5466858004" → "Product Engineer V0")
12. **CRITICAL DATA VALIDATION** - Before creating any event, validate ALL fields:
    - **HABIT**: habit name must NOT be timestamp, date, "Unknown", empty, or raw input. Must be descriptive text (2-50 chars, letters/spaces only)
    - **JOBS**: company and role must NOT be "Unknown", "To be determined", timestamps, dates, or raw input
    - **GENERAL**: Reject timestamps/dates in text fields, reject "Unknown"/"To be determined", reject empty required fields
    - If validation fails, return empty events array and ask clarifying question
13. **HABIT STORAGE**: ALWAYS store habit name in \`meta.habit\` field, NOT in habitId or other fields
14. **TIMESTAMP DETECTION**: If you detect timestamp patterns (ISO 8601, dates) in habit names or other text fields, REJECT and ask for clarification

Return JSON only with this exact structure:
{
  "events": [
    {
      "domain": "WELLNESS" | "WORKOUT" | "HABIT" | "JOBS" | "FINANCES" | "LEARNING" | "PRODUCTIVITY" | "HEALTH" | "SOBRIETY" | "ROUTINE" | null,
      "type": "specific event type matching domain",
      "payload": { ... all fields from schema ... },
      "confidence": 0.0-1.0
    }
  ],
  "response": "friendly confirmation message or clarifying question",
  "suggestedCategory": { "name": "CATEGORY_NAME", "reason": "why" } | null
}

EVENT TYPE MAPPINGS:

WELLNESS:
- WATER_LOGGED: { amount: number, unit: "ml"|"cups"|"oz"|"liters" }
- SLEEP_LOGGED: { hours: number }
- MOOD_LOGGED: { mood: string, value: number (1-10) }
- NUTRITION_LOGGED: { food: string, calories?: number }

WORKOUT:
- SET_COMPLETED: { exercise: string, reps: number, weight: number, unit: "kg"|"lbs" }
- WORKOUT_COMPLETED: { exercise: string, reps?: number, distance?: number, duration?: number, unit: string }

HABIT:
- HABIT_COMPLETED: { habit: string (normalized) }
  - Use this when user says they DID something (past tense, completed action)
  - Examples: "quit smoking today", "did my exercise", "completed meditation"
- HABIT_GOAL_SET: { habit: string (normalized), goal?: string, target?: string, timeline?: string }
  - Use this when user says they WANT TO or ARE TRYING TO do something (future intent, goal setting)
  - Examples: "i want to quit smoking", "trying to quit smoking", "i am trying to quit smoking"
  - These should trigger clarifying questions about goals, timelines, targets

JOBS:
- JOB_APPLIED: { company: string, role: string, status: "INTERESTED"|"APPLIED", url?: string, salary?: number }
- JOB_FOUND: { count: number, incomplete?: boolean, notes?: string }
- JOB_INTERVIEW: { company: string, role?: string, url?: string, notes?: string }
- JOB_OFFER: { company: string, role?: string, salary?: number, status: "PENDING"|"ACCEPTED"|"DECLINED", url?: string }

FINANCES:
- EXPENSE_LOGGED: { amount: number, currency: "USD"|"GBP"|"EUR"|"JPY", category: string, notes?: string }
- INCOME_LOGGED: { amount: number, currency: "USD"|"GBP"|"EUR"|"JPY", notes?: string }

LEARNING:
- COURSE_STARTED: { type: "COURSE"|"BOOK"|"SKILL", title: string, progress: number }
- COURSE_COMPLETED: { type: string, title: string, progress: 100 }
- BOOK_READ: { type: "BOOK", title: string, pages?: number, progress?: number }

PRODUCTIVITY:
- TASK_COMPLETED: { type: string, count?: number, description?: string }
- PROJECT_COMPLETED: { type: "PROJECT", count: number, description?: string }
- FOCUS_SESSION: { duration: number, unit: "minutes"|"hours" }
- POMODORO_COMPLETED: { duration: 25, unit: "minutes" }

HEALTH:
- SYMPTOM_LOGGED: { symptom: string, notes?: string }
- MEDICATION_TAKEN: { medication: string, condition?: string }
- VITAL_LOGGED: { type: "blood_pressure"|"heart_rate"|"temperature"|"weight", value: number, unit: string }

SOBRIETY:
- SOBRIETY_LOGGED: { status: "sober"|"craving"|"relapsed", days?: number, craving?: number (1-10), notes?: string }

ROUTINE:
- ROUTINE_CHECKED: { routine: string, status: "completed"|"partial"|"skipped" }

EXAMPLES:

With conversation context:
Input: "5kg" (Previous: "did 50 russian deadlifts today")
Output: {
  "events": [{
    "domain": "WORKOUT",
    "type": "SET_COMPLETED",
    "payload": { "exercise": "russian deadlifts", "reps": 50, "weight": 5, "unit": "kg" },
    "confidence": 0.95
  }],
  "response": "💪 Nice! Logged 50 reps of russian deadlifts at 5kg."
}

Input: "i applied to the v0 role" (Previous: "i want to apply to this job\nhttps://vercel.com/careers/product-engineer-v0-5466858004" → JOBS/JOB_APPLIED (company: Vercel, role: Product Engineer V0))
Output: {
  "events": [{
    "domain": "JOBS",
    "type": "JOB_APPLIED",
    "payload": { "company": "Vercel", "role": "Product Engineer V0", "status": "APPLIED", "url": "https://vercel.com/careers/product-engineer-v0-5466858004" },
    "confidence": 0.95
  }],
  "response": "💼 Logged job application for Product Engineer V0 at Vercel. Good luck!"
}

Input: "i want to apply to this job\nhttps://vercel.com/careers/product-engineer-v0-5466858004"
Output: {
  "events": [{
    "domain": "JOBS",
    "type": "JOB_APPLIED",
    "payload": { "company": "Vercel", "role": "Product Engineer V0", "status": "INTERESTED", "url": "https://vercel.com/careers/product-engineer-v0-5466858004" },
    "confidence": 0.95
  }],
  "response": "💼 Logged job application for Product Engineer V0 at Vercel. Good luck!"
}

Input: "drank 500ml of water"
Output: {
  "events": [{
    "domain": "WELLNESS",
    "type": "WATER_LOGGED",
    "payload": { "amount": 500, "unit": "ml" },
    "confidence": 0.95
  }],
  "response": "💧 Got it! Logged 500 ml of water. Keep it up!"
}

Input: "quitting smoking today" (past action - completed)
Output: {
  "events": [{
    "domain": "HABIT",
    "type": "HABIT_COMPLETED",
    "payload": { "habit": "quit smoking" },
    "confidence": 0.9
  }],
  "response": "✅ Marked 'quit smoking' as complete. Keep it up!"
}

Input: "i am trying to quit smoking" (future intent - goal setting)
Output: {
  "events": [],
  "response": "That's great! Let's set up your quit smoking goal. 🎯\n\nA few questions to help me track your progress:\n• What's your target/goal? (e.g., 'quit completely', 'reduce to 1 per day')\n• What's your timeline? (e.g., '30 days', 'by end of month')\n• What's your motivation? (e.g., 'health', 'save money', 'feel better')\n\nOnce you share these, I'll help you track your progress!"
},

Input: "did 5 squats at 100kg"
Output: {
  "events": [{
    "domain": "WORKOUT",
    "type": "SET_COMPLETED",
    "payload": { "exercise": "squats", "reps": 5, "weight": 100, "unit": "kg" },
    "confidence": 0.95
  }],
  "response": "💪 Nice! Logged 5 reps of squats at 100kg."
}

CRITICAL RULES:
- Always extract company and role from URLs when provided
- Normalize habit names consistently
- Include all required fields from the domain schema
- Use confidence 0.9+ when you have complete information
- Use confidence 0.6-0.8 when information is partial
- If truly unclear, return suggestedCategory instead of guessing`,
          },
          {
            role: 'user',
            content: enhancedText,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Very low temperature for consistent, accurate parsing
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return {
        events: [],
        response: "I had trouble understanding that. Could you try rephrasing?",
      }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) {
      return {
        events: [],
        response: "I couldn't process that. Please try again.",
      }
    }

        try {
          const parsed = JSON.parse(content)
          
          // Enhance events with URL-extracted info if available
          if (parsed.events && Array.isArray(parsed.events) && urlExtracted && urlMatch) {
            parsed.events.forEach((event: ParsedEvent) => {
              if (event.domain === 'JOBS') {
                event.payload.company = urlExtracted!.company || event.payload.company
                event.payload.role = urlExtracted!.role || event.payload.role
                event.payload.url = urlMatch
                if (urlExtracted!.company && urlExtracted!.role) {
                  event.confidence = Math.max(event.confidence, 0.9)
                }
              }
            })
          }
          
          // Validate all events before returning
          const { validateEvent } = await import('./validate-data')
          const validatedEvents = []
          for (const event of parsed.events || []) {
            const validation = validateEvent(event)
            if (validation.valid) {
              validatedEvents.push(event)
            } else {
              console.warn(`Rejected invalid event: ${validation.error}`, event)
              // Don't include invalid events - they'll be filtered out
            }
          }
          
          // If all events were invalid, return clarifying question
          if (validatedEvents.length === 0 && (parsed.events || []).length > 0) {
            return {
              events: [],
              response: "I couldn't extract valid data from that. Could you provide more details? For example: 'quit smoking', 'drank 500ml water', or 'applied to Software Engineer at Google'",
            }
          }
          
          parsed.events = validatedEvents

      return {
        events: parsed.events || [],
        response: parsed.response || generateDefaultResponse(parsed.events || []),
        suggestedCategory: parsed.suggestedCategory || undefined,
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError)
      console.error('Raw content:', content)
      return {
        events: [],
        response: "I understood something but couldn't parse it correctly. Please try rephrasing.",
      }
    }
  } catch (error: any) {
    console.error('LLM parsing error:', error)
    return {
      events: [],
      response: "I encountered an error processing that. Please try again.",
    }
  }
}

function generateDefaultResponse(events: ParsedEvent[]): string {
  if (events.length === 0) {
    return "I'm not sure how to track that. Could you give me more details?"
  }

  const domainEmojis: Record<string, string> = {
    WELLNESS: '💧',
    WORKOUT: '💪',
    HABIT: '✅',
    JOBS: '💼',
    FINANCES: '💰',
    LEARNING: '📚',
    PRODUCTIVITY: '🎯',
    HEALTH: '🏥',
    SOBRIETY: '🌱',
    ROUTINE: '🔄',
  }

  return events.map(event => {
    const emoji = domainEmojis[event.domain] || '✨'
    return `${emoji} Logged ${event.type.replace(/_/g, ' ').toLowerCase()} for ${event.domain}.`
  }).join('\n')
}


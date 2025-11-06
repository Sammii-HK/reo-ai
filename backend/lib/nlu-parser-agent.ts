// Agent-based NLU parser using LLM function calling (provider-agnostic)
import {
  getDomainSchema,
  getUserDomains,
  getRecentContext,
  validateEventData,
  extractJobInfo,
  normalizeHabitName,
} from './agent-functions'
import { createLLMProvider, LLMMessage, LLMFunction } from './llm-provider'

export interface ParseResult {
  isQuery: boolean
  queryType?: 'goals' | 'habits' | 'stats' | 'recent' | 'progress' | null
  queryDomain?: string | null
  events: ParsedEvent[]
  response: string
  suggestedCategory?: { name: string; reason: string } | null
}

export interface ParsedEvent {
  domain: string
  type: string
  payload: Record<string, any>
  confidence: number
}

// Minimal system prompt with examples (replaces the huge chatgpt-context.md)
const SYSTEM_PROMPT = `You are an expert natural language parser for a life tracking application.

Your job is to:
1. Understand what the user wants to log or query
2. Extract structured data from their input
3. Map it to the correct domain and event type
4. Validate the data before creating events

CORE RULES:
- If user is asking a question (query), set isQuery: true
- If user is logging data, set isQuery: false
- For workouts: weight is REQUIRED - if missing, return empty events and ask
- For habits: distinguish "I want to quit" (goal) vs "I quit" (completion)
- For jobs: extract company and role from URLs when provided
- Always validate data - reject timestamps, "Unknown", or incomplete data

EXAMPLES:
Input: "drank 500ml of water"
→ { "isQuery": false, "events": [{ "domain": "WELLNESS", "type": "WATER_LOGGED", "payload": { "amount": 500, "unit": "ml" } }], "response": "💧 Logged 500ml of water!" }

Input: "i did 40 hip thrusts, 10 good mornings" (no weight)
→ { "isQuery": false, "events": [], "response": "Great workout! 💪 What weight did you use for hip thrusts and good mornings?" }

Input: "can you record all of those exercises at 35kg" (follow-up)
→ Use getRecentContext() first, then create events with weight

Input: "how much water have i drunk today?"
→ { "isQuery": true, "queryType": "stats", "queryDomain": "WELLNESS", "events": [], "response": "Checking your water intake..." }

Use the available functions to:
- Get domain schemas when you need field definitions
- Get recent context for follow-up messages (ALWAYS check for follow-ups)
- Validate events before creating them
- Extract job info from URLs

IMPORTANT: Always return valid JSON. Use the exact structure below.

Return JSON with this structure:
{
  "isQuery": boolean,
  "queryType": "goals" | "habits" | "stats" | "recent" | "progress" | null,
  "queryDomain": string | null,
  "events": [{
    "domain": string,
    "type": string,
    "payload": {...},
    "confidence": number
  }],
  "response": string,
  "suggestedCategory": { "name": string, "reason": string } | null
}`

// Define functions available to the agent
const AGENT_FUNCTIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'getDomainSchema',
      description: 'Get the schema and field definitions for a specific domain (e.g., WORKOUT, HABIT, JOBS). Use this when you need to know what fields are required for a domain.',
      parameters: {
        type: 'object',
        properties: {
          domainName: {
            type: 'string',
            description: 'The domain name (e.g., "WORKOUT", "HABIT", "JOBS", "WELLNESS")',
            enum: [
              'WELLNESS',
              'WORKOUT',
              'HABIT',
              'JOBS',
              'FINANCES',
              'LEARNING',
              'PRODUCTIVITY',
              'HEALTH',
              'SOBRIETY',
              'ROUTINE',
            ],
          },
        },
        required: ['domainName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getUserDomains',
      description: 'Get the list of domains available to the user. Use this to see what categories they have enabled.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getRecentContext',
      description: 'Get recent events for context. Use this when the user input seems like a follow-up to a previous message (e.g., "5kg" after mentioning exercises, or "i applied" after mentioning a job).',
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Optional: filter by domain name',
          },
          limit: {
            type: 'number',
            description: 'Number of recent events to retrieve (default: 5)',
            default: 5,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validateEventData',
      description: 'Validate an event before creating it. Use this to check if data is valid (not timestamps, not "Unknown", etc.).',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          type: { type: 'string' },
          payload: { type: 'object' },
        },
        required: ['domain', 'type', 'payload'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'extractJobInfo',
      description: 'Extract company and role information from a job posting URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The job posting URL',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'normalizeHabitName',
      description: 'Normalize a habit name to a standard form (e.g., "quitting smoking" -> "quit smoking").',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The habit name to normalize',
          },
        },
        required: ['name'],
      },
    },
  },
]

export async function parseInputWithAgent(
  text: string,
  userId: string,
  apiKey?: string
): Promise<ParseResult> {
  // Create LLM provider (OpenAI, Claude, Ollama, etc.)
  let provider
  try {
    provider = createLLMProvider()
  } catch (error: any) {
    return {
      isQuery: false,
      events: [],
      response:
        `I need an LLM API key to understand your input. Please configure it in the backend. Error: ${error.message}`,
    }
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ]

  let maxIterations = 5 // Prevent infinite loops
  let iteration = 0

  while (iteration < maxIterations) {
    iteration++

    try {
      // Call LLM provider with function calling
      // Use temperature 0 for more consistent, deterministic outputs
      const response = await provider.chat(messages, AGENT_FUNCTIONS, {
        tool_choice: 'auto',
        temperature: 0, // More deterministic for structured parsing
        max_tokens: 2000, // Limit response length
      })

      // Add assistant's message to conversation
      const assistantMessage: LLMMessage = {
        role: 'assistant',
        content: response.content || undefined,
        tool_calls: response.tool_calls,
      }
      messages.push(assistantMessage)

      // Check if agent wants to call functions
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Execute function calls in parallel for better performance
        const functionPromises = response.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name
          let functionArgs: any
          
          try {
            functionArgs = JSON.parse(toolCall.function.arguments)
          } catch (e) {
            return {
              toolCallId: toolCall.id,
              result: {
                success: false,
                error: `Invalid function arguments: ${e}`,
              },
            }
          }

          let functionResult: any

          try {
            // Call the appropriate function
            switch (functionName) {
              case 'getDomainSchema':
                functionResult = await getDomainSchema(
                  userId,
                  functionArgs.domainName
                )
                break
              case 'getUserDomains':
                functionResult = await getUserDomains(userId)
                break
              case 'getRecentContext':
                functionResult = await getRecentContext(
                  userId,
                  functionArgs.domain,
                  functionArgs.limit || 5
                )
                break
              case 'validateEventData':
                functionResult = await validateEventData(
                  functionArgs.domain,
                  functionArgs.type,
                  functionArgs.payload
                )
                break
              case 'extractJobInfo':
                functionResult = await extractJobInfo(functionArgs.url)
                break
              case 'normalizeHabitName':
                functionResult = normalizeHabitName(functionArgs.name)
                break
              default:
                functionResult = {
                  success: false,
                  error: `Unknown function: ${functionName}`,
                }
            }
          } catch (error: any) {
            functionResult = {
              success: false,
              error: `Function error: ${error.message}`,
            }
          }

          return {
            toolCallId: toolCall.id,
            result: functionResult,
          }
        })

        // Wait for all function calls to complete in parallel
        const functionResults = await Promise.all(functionPromises)

        // Add all function results to conversation
        for (const { toolCallId, result } of functionResults) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
          })
        }

        // Continue loop to let agent process function results
        continue
      }

      // Agent is done - parse the final response
      const content = response.content

      if (!content) {
        return {
          isQuery: false,
          events: [],
          response: 'I had trouble understanding that. Could you rephrase?',
        }
      }

      try {
        // Try to parse JSON response
        const parsed = JSON.parse(content)
        return parsed as ParseResult
      } catch (e) {
        // If not JSON, wrap it
        return {
          isQuery: false,
          events: [],
          response: content || 'I had trouble understanding that. Could you rephrase?',
        }
      }
    } catch (error: any) {
      return {
        isQuery: false,
        events: [],
        response: `Error processing request: ${error.message}. Please try again.`,
      }
    }
  }

  // Max iterations reached
  return {
    isQuery: false,
    events: [],
    response:
      'I had trouble processing that request. Please try again or be more specific.',
  }
}


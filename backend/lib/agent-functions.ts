// Agent function handlers - these are called by OpenAI when agent needs info
import { prisma } from '@/lib/prisma'
import { retryQuery } from '@/lib/prisma-helper'
import { validateEvent } from './validate-data'
import { agentCache } from './agent-cache'

export interface AgentFunctionResult {
  success: boolean
  data?: any
  error?: string
}

// Extract job info from URL (imported from nlu-parser)
async function extractJobFromUrl(url: string): Promise<{ company?: string; role?: string }> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    const companyName = hostname
      .split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    const pathParts = urlObj.pathname.split('/').filter(p => p)
    let role: string | undefined

    // Look for common job paths
    const jobPathIndices = pathParts.findIndex(p => 
      ['careers', 'jobs', 'positions', 'openings'].includes(p.toLowerCase())
    )

    if (jobPathIndices !== -1 && pathParts[jobPathIndices + 1]) {
      const rolePart = pathParts[jobPathIndices + 1]
      // Remove trailing numeric IDs (e.g., "-5466858004")
      const cleaned = rolePart.replace(/-\d+$/, '')
      // Convert kebab-case to Title Case
      role = cleaned
        .split('-')
        .map(word => {
          // Preserve version numbers like "v0", "v1"
          if (word.match(/^v\d+$/i)) {
            return word.toUpperCase()
          }
          return word.charAt(0).toUpperCase() + word.slice(1)
        })
        .join(' ')
    }

    return { company: companyName, role }
  } catch (e) {
    return {}
  }
}

// Get domain schema from database (with caching)
export async function getDomainSchema(
  userId: string,
  domainName: string
): Promise<AgentFunctionResult> {
  // Check cache first
  const cacheKey = `user:${userId}:domain:${domainName}`
  const cached = agentCache.get<any>(cacheKey)
  if (cached) {
    return { success: true, data: cached }
  }

  try {
    const domain = await retryQuery(() =>
      prisma.domain.findFirst({
        where: {
          userId,
          name: domainName,
        },
        select: {
          schema: true,
          name: true,
          enabled: true,
        },
      })
    )

    if (!domain) {
      return {
        success: false,
        error: `Domain "${domainName}" not found. Available domains: WELLNESS, WORKOUT, HABIT, JOBS, FINANCES, LEARNING, PRODUCTIVITY, HEALTH, SOBRIETY, ROUTINE`,
      }
    }

    const result = {
      name: domain.name,
      enabled: domain.enabled,
      schema: domain.schema,
      fields: (domain.schema as any)?.fields || [],
    }

    // Cache for 5 minutes
    agentCache.set(cacheKey, result, 5 * 60 * 1000)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get domain schema',
    }
  }
}

// Get list of user's domains (with caching)
export async function getUserDomains(
  userId: string
): Promise<AgentFunctionResult> {
  // Check cache first
  const cacheKey = `user:${userId}:domains`
  const cached = agentCache.get<any>(cacheKey)
  if (cached) {
    return { success: true, data: cached }
  }

  try {
    const domains = await retryQuery(() =>
      prisma.domain.findMany({
        where: { userId },
        select: { name: true, enabled: true },
        orderBy: { order: 'asc' },
      })
    )

    const result = {
      domains: domains.map((d) => ({ name: d.name, enabled: d.enabled })),
    }

    // Cache for 5 minutes
    agentCache.set(cacheKey, result, 5 * 60 * 1000)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get domains',
    }
  }
}

// Get recent events for context (follow-ups)
export async function getRecentContext(
  userId: string,
  domain?: string,
  limit: number = 5
): Promise<AgentFunctionResult> {
  try {
    const where: any = {
      userId,
      ts: {
        gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
      },
    }

    if (domain) {
      where.domain = domain
    }

    const events = await retryQuery(() =>
      prisma.event.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit,
        select: {
          domain: true,
          type: true,
          payload: true,
          inputText: true,
          ts: true,
        },
      })
    )

    return {
      success: true,
      data: {
        events: events.map((e) => ({
          domain: e.domain,
          type: e.type,
          payload: e.payload,
          inputText: e.inputText,
          timestamp: e.ts,
        })),
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get recent context',
    }
  }
}

// Validate an event before creating it
export async function validateEventData(
  domain: string,
  type: string,
  payload: any
): Promise<AgentFunctionResult> {
  try {
    const validation = validateEvent({ domain, type, payload })

    return {
      success: validation.valid,
      data: validation.valid ? { valid: true } : undefined,
      error: validation.error,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Validation failed',
    }
  }
}

// Extract job info from URL
export async function extractJobInfo(
  url: string
): Promise<AgentFunctionResult> {
  try {
    const extracted = await extractJobFromUrl(url)
    return {
      success: true,
      data: extracted,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to extract job info',
    }
  }
}

// Normalize habit name
export function normalizeHabitName(name: string): AgentFunctionResult {
  // Common normalizations
  const normalizations: Record<string, string> = {
    'quitting smoking': 'quit smoking',
    'stopping smoking': 'quit smoking',
    'no smoking': 'quit smoking',
    'quitting drinking': 'quit drinking',
    'stopping drinking': 'quit drinking',
    'no alcohol': 'quit drinking',
    'healthy eating': 'eat healthy',
    'eating healthy': 'eat healthy',
    'drinking water': 'drink water',
    'staying hydrated': 'drink water',
  }

  const normalized = normalizations[name.toLowerCase()] || name.toLowerCase()

  return {
    success: true,
    data: { original: name, normalized },
  }
}


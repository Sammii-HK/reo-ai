const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://reo-ai-production.up.railway.app'

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
        status: response.status,
      }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async signup(email: string, password: string) {
    return this.request<{
      user: any
      session: {
        access_token: string
        refresh_token: string
        expires_at: number
      }
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async signin(email: string, password: string) {
    return this.request<{
      user: any
      session: {
        access_token: string
        refresh_token: string
        expires_at: number
      }
    }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async verifyToken(token: string) {
    return this.request<{ user: any }>('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  // Waitlist endpoints
  async verifyInviteCode(code: string) {
    return this.request<{
      valid: boolean
      email: string
    }>(`/api/waitlist/verify/${code}`)
  }

  // Ingestion endpoint (for conversational input)
  async ingest(text: string) {
    return this.request<{
      success: boolean
      events: any[]
    }>('/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  // Summary endpoint
  async getSummary(period: 'daily' | 'weekly' = 'daily') {
    return this.request<{
      summary: string
      metrics: any
    }>(`/api/summary?period=${period}`)
  }

  // Metrics endpoint
  async getMetrics(domainId?: string) {
    const url = domainId
      ? `/api/metrics?domain=${domainId}`
      : '/api/metrics'
    return this.request<{
      metrics: any[]
    }>(url)
  }
}

export const apiClient = new ApiClient(API_URL)

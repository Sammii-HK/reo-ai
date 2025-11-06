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

    try {
      console.log('🌐 Making request:', {
        method: options.method || 'GET',
        url,
        hasToken: !!this.accessToken,
        tokenPreview: this.accessToken ? `${this.accessToken.substring(0, 20)}...` : 'none',
      })

      const response = await fetch(url, {
        ...options,
        headers,
      })

      console.log('📡 Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Request failed' }
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const jsonData = await response.json()
      console.log('✅ API success:', { endpoint, hasData: !!jsonData })
      return jsonData
    } catch (error: any) {
      // Handle network errors
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message?.includes('NetworkError') || error.message?.includes('Network request failed')) {
        console.error('❌ Network error:', {
          url,
          hasToken: !!this.accessToken,
          baseUrl: this.baseUrl,
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
        })
        
        // Check if it's a CORS or connection issue
        const isLikelyBackendDown = !error.message.includes('CORS')
        const errorMsg = isLikelyBackendDown
          ? `Cannot connect to backend server at ${this.baseUrl}. Please check if the backend is running and accessible. If you're using a simulator, try using a physical device or check network settings.`
          : `Connection error. Please check your internet connection.`
        
        throw new Error(errorMsg)
      }
      
      // Re-throw other errors (including API errors)
      console.error('❌ Request error:', error)
      throw error
    }
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
  async ingest(text: string, context?: Array<{ text: string; isUser: boolean }>) {
    console.log('📤 Sending ingest request:', { text, url: `${this.baseUrl}/api/ingest`, hasToken: !!this.accessToken, hasContext: !!context })
    return this.request<{
      success: boolean
      events: any[]
      response: string
      parsed: boolean
      suggestedCategory?: { name: string; reason: string }
    }>('/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    })
  }

  // Summary endpoint
  async getSummary(period: 'daily' | 'weekly' = 'daily') {
    return this.request<{
      summary: string
      period: string
      startDate: string
      endDate: string
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

  // Domains endpoints
  async getDomains() {
    return this.request<{
      domains: any[]
    }>('/api/domains')
  }

  async ensureDomains() {
    return this.request<{
      message: string
      domains: any[]
      count?: number
    }>('/api/domains/ensure', {
      method: 'POST',
    })
  }

  async createDomain(data: {
    name: string
    type?: 'PRESET' | 'CUSTOM'
    schema?: Record<string, any>
    icon?: string
    color?: string
  }) {
    return this.request<{
      domain: any
    }>('/api/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDomain(domainId: string, data: {
    enabled?: boolean
    name?: string
    schema?: Record<string, any>
    icon?: string
    color?: string
    order?: number
  }) {
    return this.request<{
      domain: any
    }>(`/api/domains/${domainId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Domain view endpoint
  async getDomainData(domainId: string, limit?: number, offset?: number) {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    const query = params.toString()
    return this.request<{
      domain: any
      events: any[]
      logs: any[]
      total: number
    }>(`/api/domains/${domainId}${query ? `?${query}` : ''}`)
  }

  // Audio ingest endpoint
  async ingestAudio(audioUri: string) {
    const formData = new FormData()
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/webm',
      name: 'audio.webm',
    } as any)

    const response = await fetch(`${this.baseUrl}/api/ingest/audio`, {
      method: 'POST',
      headers: {
        'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
      },
      body: formData,
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
}

export const apiClient = new ApiClient(API_URL)

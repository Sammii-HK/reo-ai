// LLM Provider abstraction - allows swapping between different AI providers
// Currently supports OpenAI, but can be extended to support Claude, Gemini, local LLMs, etc.

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export interface LLMFunction {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: any
  }
}

export interface LLMResponse {
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export interface LLMProvider {
  chat(
    messages: LLMMessage[],
    functions?: LLMFunction[],
    options?: Record<string, any>
  ): Promise<LLMResponse>
}

// OpenAI Provider Implementation
export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(
    messages: LLMMessage[],
    functions?: LLMFunction[],
    options?: Record<string, any>
  ): Promise<LLMResponse> {
    // Use JSON mode for structured outputs (OpenAI feature)
    const useJsonMode = options?.response_format === 'json_object' || false
    
    const body: any = {
      model: this.model,
      messages: messages.map((msg) => {
        const openaiMsg: any = {
          role: msg.role,
        }
        if (msg.content) openaiMsg.content = msg.content
        if (msg.tool_call_id) openaiMsg.tool_call_id = msg.tool_call_id
        if (msg.tool_calls) openaiMsg.tool_calls = msg.tool_calls
        return openaiMsg
      }),
      tools: functions,
      tool_choice: options?.tool_choice || 'auto',
      ...options,
    }

    // Add JSON mode if requested (only works without function calling)
    if (useJsonMode && !functions) {
      body.response_format = { type: 'json_object' }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const choice = data.choices[0]
    const message = choice.message

    return {
      content: message.content,
      tool_calls: message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    }
  }
}

// Anthropic Claude Provider (example - can be implemented)
export class ClaudeProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(
    messages: LLMMessage[],
    functions?: LLMFunction[],
    options?: Record<string, any>
  ): Promise<LLMResponse> {
    // Convert messages to Claude format
    const claudeMessages = messages
      .filter((m) => m.role !== 'system' && m.role !== 'tool')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      }))

    const systemMessage = messages.find((m) => m.role === 'system')?.content || ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemMessage,
        messages: claudeMessages,
        tools: functions?.map((f) => ({
          name: f.function.name,
          description: f.function.description,
          input_schema: f.function.parameters,
        })),
        ...options,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }

    const data = await response.json()

    // Convert Claude response to our format
    const content = data.content.find((c: any) => c.type === 'text')?.text || null
    const toolCalls = data.content
      .filter((c: any) => c.type === 'tool_use')
      .map((c: any) => ({
        id: c.id,
        type: 'function' as const,
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input),
        },
      }))

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}

// Local LLM Provider (Ollama example)
export class OllamaProvider implements LLMProvider {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
    this.baseUrl = baseUrl
    this.model = model
  }

  async chat(
    messages: LLMMessage[],
    functions?: LLMFunction[],
    options?: Record<string, any>
  ): Promise<LLMResponse> {
    // Note: Ollama doesn't support function calling natively
    // You'd need to use a library like llama.cpp with function calling support
    // This is a simplified example

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        ...options,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${error}`)
    }

    const data = await response.json()

    return {
      content: data.message?.content || null,
      // Ollama doesn't support function calling - would need custom parsing
    }
  }
}

// Factory function to create provider based on environment
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'openai'
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || ''

  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(
        process.env.OPENAI_API_KEY || '',
        process.env.OPENAI_MODEL || 'gpt-4o-mini'
      )
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(
        process.env.ANTHROPIC_API_KEY || '',
        process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
      )
    case 'ollama':
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'llama3'
      )
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}


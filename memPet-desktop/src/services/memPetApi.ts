import type { components, operations } from '@/types/memPetApi'
import type { EventSourceMessage } from '@microsoft/fetch-event-source'

import { fetchEventSource } from '@microsoft/fetch-event-source'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

type Schemas = components['schemas']
type OperationId = keyof operations

type OperationRequest<T extends OperationId> = operations[T] extends {
  requestBody: { content: { 'application/json': infer TBody } }
}
  ? TBody
  : operations[T] extends {
    requestBody?: { content: { 'application/json': infer TOptionalBody } | null }
  }
    ? TOptionalBody
    : never

type OperationResponse<T extends OperationId> = operations[T]['responses'][200]['content']['application/json']

interface ApiEnvelopeLike<TData = unknown> {
  status: 'success' | 'error'
  data?: TData | null
  error?: string | null
  [legacyField: string]: unknown
}

export type RootData = NonNullable<Schemas['ApiEnvelope_RootData_']['data']>
export type HealthData = NonNullable<Schemas['ApiEnvelope_HealthData_']['data']>
export type MemorizeData = NonNullable<Schemas['ApiEnvelope_MemorizeData_']['data']>
export type RetrieveData = NonNullable<Schemas['ApiEnvelope_RetrieveData_']['data']>
export type BatchObservationsData = NonNullable<Schemas['ApiEnvelope_BatchObservationsData_']['data']>
export type BatchFlushData = NonNullable<Schemas['ApiEnvelope_BatchFlushData_']['data']>
export type ProactiveAnalyzeData = NonNullable<Schemas['ApiEnvelope_ProactiveAnalyzeData_']['data']>
export type ProactiveGenerateData = NonNullable<Schemas['ApiEnvelope_ProactiveGenerateData_']['data']>
export type ProactiveQuickData = NonNullable<Schemas['ApiEnvelope_ProactiveQuickData_']['data']>
export type CooldownData = NonNullable<Schemas['ApiEnvelope_CooldownData_']['data']>
export type CooldownResetData = NonNullable<Schemas['ApiEnvelope_CooldownResetData_']['data']>
export type ChatData = NonNullable<Schemas['ApiEnvelope_ChatData_']['data']>

export type MemorizeConversationRequest = OperationRequest<'memorize_memorize_post'>
export type MemorizeObservationRequest = OperationRequest<'memorize_memorize_post'>
export type RetrieveConversationRequest = OperationRequest<'retrieve_retrieve_post'>
export type RetrieveProactiveRequest = OperationRequest<'retrieve_retrieve_post'>
export type ChatRequest = OperationRequest<'chat_chat_post'>
export type ChatStreamRequest = OperationRequest<'chat_stream_chat_stream_post'>
export type ProactiveAnalyzeRequest = OperationRequest<'proactive_analyze_proactive_analyze_post'>
export type ProactiveGenerateRequest = OperationRequest<'proactive_generate_proactive_generate_post'>
export type ProactiveQuickRequest = OperationRequest<'proactive_quick_proactive_quick_post'>
export type BatchObservationsRequest = OperationRequest<'batch_observations_batch_observations_post'>
export type CooldownResetRequest = OperationRequest<'proactive_cooldown_reset_proactive_cooldown_reset_post'>

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000'

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_MEMPET_API_BASE_URL
  return (fromEnv || DEFAULT_BASE_URL).replace(/\/$/, '')
}

function toErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const raw = payload as Record<string, unknown>
    if (typeof raw.error === 'string' && raw.error) {
      return raw.error
    }
    if (typeof raw.detail === 'string' && raw.detail) {
      return raw.detail
    }
  }
  return fallback
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return {}
  }
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function ensureEnvelope(payload: unknown): ApiEnvelopeLike {
  if (!payload || typeof payload !== 'object') {
    throw new Error('后端响应不是有效 JSON 对象')
  }
  const envelope = payload as ApiEnvelopeLike
  if (typeof envelope.status !== 'string') {
    throw new TypeError('后端响应缺少 status 字段')
  }
  return envelope
}

export interface StreamHandlers {
  onMetadata?: (payload: Record<string, unknown>) => void
  onChunk?: (content: string) => void
  onComplete?: (payload: Record<string, unknown>) => void
  onError?: (payload: Record<string, unknown>) => void
}

export class MemPetApiClient {
  constructor(private readonly baseUrl: string = resolveApiBaseUrl()) {}

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async request<TResponse extends Record<string, unknown>>(
    path: string,
    options: {
      method?: 'GET' | 'POST'
      body?: unknown
      headers?: Record<string, string>
    } = {},
  ): Promise<TResponse> {
    const method = options.method || 'GET'
    const response = await tauriFetch(this.buildUrl(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const payload = await parseResponseBody(response)

    if (!response.ok) {
      const message = toErrorMessage(payload, `请求失败: ${response.status}`)
      throw new Error(message)
    }

    const envelope = ensureEnvelope(payload)
    if (envelope.status === 'error') {
      throw new Error(envelope.error || '后端返回错误')
    }
    return envelope as unknown as TResponse
  }

  root() {
    return this.request<OperationResponse<'root__get'>>('/')
  }

  health() {
    return this.request<OperationResponse<'health_health_get'>>('/health')
  }

  memorizeConversation(payload: MemorizeConversationRequest) {
    const body = payload.type ? payload : { ...payload, type: 'conversation' }
    return this.request<OperationResponse<'memorize_memorize_post'>>('/memorize', {
      method: 'POST',
      body,
    })
  }

  memorizeObservation(payload: MemorizeObservationRequest) {
    return this.request<OperationResponse<'memorize_memorize_post'>>('/memorize', {
      method: 'POST',
      body: payload,
    })
  }

  retrieveConversation(payload: RetrieveConversationRequest) {
    const body = payload.scenario ? payload : { ...payload, scenario: 'conversation' }
    return this.request<OperationResponse<'retrieve_retrieve_post'>>('/retrieve', {
      method: 'POST',
      body,
    })
  }

  retrieveProactive(payload: RetrieveProactiveRequest) {
    return this.request<OperationResponse<'retrieve_retrieve_post'>>('/retrieve', {
      method: 'POST',
      body: payload,
    })
  }

  chat(payload: ChatRequest) {
    return this.request<OperationResponse<'chat_chat_post'>>('/chat', {
      method: 'POST',
      body: payload,
    })
  }

  proactiveAnalyze(payload: ProactiveAnalyzeRequest) {
    return this.request<OperationResponse<'proactive_analyze_proactive_analyze_post'>>('/proactive/analyze', {
      method: 'POST',
      body: payload,
    })
  }

  proactiveGenerate(payload: ProactiveGenerateRequest) {
    return this.request<OperationResponse<'proactive_generate_proactive_generate_post'>>('/proactive/generate', {
      method: 'POST',
      body: payload,
    })
  }

  proactiveQuick(payload: ProactiveQuickRequest) {
    return this.request<OperationResponse<'proactive_quick_proactive_quick_post'>>('/proactive/quick', {
      method: 'POST',
      body: payload,
    })
  }

  getCooldownStatus() {
    return this.request<OperationResponse<'proactive_cooldown_proactive_cooldown_get'>>('/proactive/cooldown')
  }

  resetCooldown(payload: CooldownResetRequest = {}) {
    return this.request<OperationResponse<'proactive_cooldown_reset_proactive_cooldown_reset_post'>>('/proactive/cooldown/reset', {
      method: 'POST',
      body: payload,
    })
  }

  batchObservations(payload: BatchObservationsRequest) {
    return this.request<OperationResponse<'batch_observations_batch_observations_post'>>('/batch/observations', {
      method: 'POST',
      body: payload,
    })
  }

  flushObservations() {
    return this.request<OperationResponse<'batch_flush_batch_flush_post'>>('/batch/flush', {
      method: 'POST',
      body: {},
    })
  }

  async streamChat(payload: ChatStreamRequest, handlers: StreamHandlers = {}, signal?: AbortSignal): Promise<void> {
    await fetchEventSource(this.buildUrl('/chat/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
      onmessage: (event: EventSourceMessage) => {
        const parsed = event.data ? (JSON.parse(event.data) as Record<string, unknown>) : {}
        if (event.event === 'metadata') {
          handlers.onMetadata?.(parsed)
          return
        }
        if (event.event === 'chunk') {
          handlers.onChunk?.(String(parsed.content || ''))
          return
        }
        if (event.event === 'complete') {
          handlers.onComplete?.(parsed)
          return
        }
        if (event.event === 'error') {
          handlers.onError?.(parsed)
        }
      },
      onerror: (err) => {
        throw err
      },
    })
  }
}

export const memPetApi = new MemPetApiClient()

export interface SystemContext {
  working_duration: number
  active_app: string
  fatigue_level: string
  is_late_night: boolean
  idle_time: number
  is_work_hours: boolean
  focus_level: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isStreaming?: boolean
  isError?: boolean
}

export interface ProactiveSuggestion {
  type?: string
  priority?: 'high' | 'medium' | 'low'
  message?: string
  reason?: string
  action?: string
  [key: string]: unknown
}

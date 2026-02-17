/**
 * Electron API 类型定义
 */

export interface SystemContext {
  working_duration: number
  active_app: string
  fatigue_level: string
  is_late_night: boolean
  idle_time: number
  is_work_hours: boolean
  focus_level: string
}

export interface Suggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  message: string
  reason: string
  action: string
}

export interface SystemObservation {
  type: 'app_switch' | 'fatigue_detected' | 'idle_detected' | 'work_session_end' | 'late_night_work' | 'break_taken'
  timestamp: string
  [key: string]: any
}

export interface ElectronAPI {
  system: {
    getContext: () => Promise<{ success: boolean; data?: SystemContext; error?: string }>
    getWorkTime: () => Promise<{ success: boolean; data?: number; error?: string }>
    getCurrentApp: () => Promise<{ success: boolean; data?: string; error?: string }>
    resetWorkTime: () => Promise<{ success: boolean; error?: string }>
  }
  memory: {
    memorizeConversation: (content: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
    memorizeObservation: (observation: SystemObservation) => Promise<{ success: boolean; data?: any; error?: string }>
    retrieveConversation: (query: string, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>
    retrieveProactive: (context: SystemContext, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>
    batchObservations: (observations: SystemObservation[]) => Promise<{ success: boolean; data?: any; error?: string }>
    flushBuffer: () => Promise<{ success: boolean; data?: any; error?: string }>
  }
  pet: {
    proactiveAnalyze: (context: SystemContext) => Promise<{ success: boolean; data?: any; error?: string }>
    proactiveGenerate: (
      suggestion: Suggestion,
      context: SystemContext,
      personality?: string,
      limit?: number
    ) => Promise<{ success: boolean; data?: any; error?: string }>
    checkService: () => Promise<{ success: boolean; data?: { isReady: boolean }; error?: string }>
  }
  chat: {
    sendMessage: (message: string) => Promise<{ success: boolean; data?: string; error?: string }>
    sendMessageStream: (message: string) => Promise<{ success: boolean; error?: string }>
    updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>
    clearHistory: () => Promise<{ success: boolean; error?: string }>
    getHistory: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  }
  events: {
    on: (channel: string, callback: (...args: any[]) => void) => void
    removeListener: (channel: string, callback: (...args: any[]) => void) => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

// Electron API 类型定义
export interface ElectronAPI {
  // 记忆相关
  memorize: (data: any) => Promise<any>
  retrieve: (query: string) => Promise<any>
  getCategories: () => Promise<any>

  // 系统监控
  getUserContext: () => Promise<UserContext>
  getActiveWindow: () => Promise<ActiveWindow>

  // 宠物行为
  setPetBehavior: (behavior: PetBehavior) => Promise<void>

  // 设置
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<void>

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

// 用户上下文
export interface UserContext {
  timestamp: string
  isWorkHours: boolean
  isLateNight: boolean
  workingDuration: number
  activeApp: string
  userMode: 'Working' | 'Studying' | 'Relaxing' | 'Gaming' | 'Idle'
  focusLevel: 'DeepFocus' | 'NormalFocus' | 'Distracted' | 'Idle'
  fatigueLevel: 'Fresh' | 'Normal' | 'Tired' | 'Exhausted'
}

// 活动窗口
export interface ActiveWindow {
  app: string
  title: string
  timestamp: string
}

// 宠物行为
export type PetBehavior =
  | 'idle'
  | 'walking'
  | 'sleeping'
  | 'thinking'
  | 'talking'
  | 'celebrating'
  | 'worrying'

// 设置
export interface Settings {
  petName: string
  language: string
  autoStart: boolean
  alwaysOnTop: boolean
  transparency: number
  personality: Personality
  llmConfig: LLMConfig
}

// 性格类型
export type Personality = 'friendly' | 'energetic' | 'professional' | 'tsundere'

// LLM 配置
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'openrouter'
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

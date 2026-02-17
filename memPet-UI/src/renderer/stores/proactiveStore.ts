import { create } from 'zustand'

interface ProactiveMessage {
  id: string
  suggestion: {
    type: string
    priority: 'high' | 'medium' | 'low'
    message: string
    reason: string
    action: string
  }
  message: string
  context: any
  timestamp: string
}

interface ProactiveState {
  currentMessage: ProactiveMessage | null
  messageHistory: ProactiveMessage[]
  isEnabled: boolean
  
  // Actions
  setCurrentMessage: (message: ProactiveMessage | null) => void
  addToHistory: (message: ProactiveMessage) => void
  clearCurrentMessage: () => void
  toggleEnabled: () => void
  clearHistory: () => void
}

export const useProactiveStore = create<ProactiveState>((set) => ({
  currentMessage: null,
  messageHistory: [],
  isEnabled: true,
  
  setCurrentMessage: (message) => {
    set({ currentMessage: message })
    if (message) {
      set((state) => ({
        messageHistory: [message, ...state.messageHistory].slice(0, 50), // 保留最近50条
      }))
    }
  },
  
  addToHistory: (message) => set((state) => ({
    messageHistory: [message, ...state.messageHistory].slice(0, 50),
  })),
  
  clearCurrentMessage: () => set({ currentMessage: null }),
  
  toggleEnabled: () => set((state) => ({ isEnabled: !state.isEnabled })),
  
  clearHistory: () => set({ messageHistory: [] }),
}))

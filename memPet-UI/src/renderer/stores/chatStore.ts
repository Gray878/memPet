import { create } from 'zustand'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatState {
  messages: Message[]
  isThinking: boolean
  
  // Actions
  addMessage: (message: Message) => void
  setThinking: (thinking: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isThinking: false,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setThinking: (thinking) => set({ isThinking: thinking }),
  
  clearMessages: () => set({ messages: [] }),
}))

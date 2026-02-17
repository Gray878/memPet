import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isProactive?: boolean
}

interface ChatState {
  // 消息列表
  messages: Message[]
  isLoading: boolean

  // 操作方法
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  setLoading: (isLoading: boolean) => void
}

export const useChatStore = create<ChatState>(set => ({
  // 初始状态
  messages: [],
  isLoading: false,

  // 操作方法
  addMessage: message =>
    set(state => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Date.now().toString(),
          timestamp: Date.now(),
        },
      ],
    })),

  clearMessages: () => set({ messages: [] }),

  setLoading: isLoading => set({ isLoading }),
}))

import { create } from 'zustand'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatState {
  messages: Message[]
  isThinking: boolean
  
  // Actions
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setLastMessageStreaming: (isStreaming: boolean) => void
  setThinking: (thinking: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isThinking: false,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages]
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        // 如果是空消息，直接设置；否则追加
        if (lastMessage.content === '') {
          lastMessage.content = content
        } else {
          lastMessage.content += content
        }
      }
    }
    return { messages }
  }),
  
  setLastMessageStreaming: (isStreaming) => set((state) => {
    const messages = [...state.messages]
    if (messages.length > 0) {
      messages[messages.length - 1].isStreaming = isStreaming
    }
    return { messages }
  }),
  
  setThinking: (thinking) => set({ isThinking: thinking }),
  
  clearMessages: () => set({ messages: [] }),
}))

import { create } from 'zustand'

export interface Memory {
  id: string
  content: string
  summary?: string
  category?: string
  memoryType?: string
  timestamp: number
}

interface MemoryState {
  // 记忆列表
  memories: Memory[]
  categories: string[]
  isLoading: boolean

  // 操作方法
  setMemories: (memories: Memory[]) => void
  addMemory: (memory: Memory) => void
  setCategories: (categories: string[]) => void
  setLoading: (isLoading: boolean) => void
}

export const useMemoryStore = create<MemoryState>(set => ({
  // 初始状态
  memories: [],
  categories: [],
  isLoading: false,

  // 操作方法
  setMemories: memories => set({ memories }),
  addMemory: memory => set(state => ({ memories: [...state.memories, memory] })),
  setCategories: categories => set({ categories }),
  setLoading: isLoading => set({ isLoading }),
}))

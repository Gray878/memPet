import { create } from 'zustand'

interface Memory {
  id: string
  type: 'conversation' | 'observation' | 'action'
  content: string
  timestamp: Date
}

interface MemoryState {
  memories: Memory[]
  searchQuery: string
  filterType: string | null
  
  // Actions
  addMemory: (memory: Memory) => void
  setSearchQuery: (query: string) => void
  setFilterType: (type: string | null) => void
  clearMemories: () => void
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  searchQuery: '',
  filterType: null,
  
  addMemory: (memory) => set((state) => ({
    memories: [memory, ...state.memories]
  })),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setFilterType: (type) => set({ filterType: type }),
  
  clearMemories: () => set({ memories: [] }),
}))

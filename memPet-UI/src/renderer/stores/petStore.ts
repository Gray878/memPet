import { create } from 'zustand'

interface PetState {
  // 宠物状态
  behavior: string
  position: { x: number; y: number }
  
  // 状态面板
  showStatusPanel: boolean
  petName: string
  status: string
  mood: string
  focusLevel: string
  workTime: string
  breakCount: number
  
  // 对话气泡
  speechBubble: {
    show: boolean
    message: string
  }
  
  // Actions
  setBehavior: (behavior: string) => void
  setPosition: (position: { x: number; y: number }) => void
  toggleStatusPanel: () => void
  showSpeech: (message: string) => void
  hideSpeech: () => void
}

export const usePetStore = create<PetState>((set) => ({
  // 初始状态
  behavior: 'Idle',
  position: { x: 100, y: 100 },
  
  showStatusPanel: false,
  petName: '小U',
  status: '空闲',
  mood: '开心',
  focusLevel: '正常',
  workTime: '0h',
  breakCount: 0,
  
  speechBubble: {
    show: false,
    message: '',
  },
  
  // Actions
  setBehavior: (behavior) => set({ behavior }),
  
  setPosition: (position) => set({ position }),
  
  toggleStatusPanel: () => set((state) => ({ 
    showStatusPanel: !state.showStatusPanel 
  })),
  
  showSpeech: (message) => set({ 
    speechBubble: { show: true, message } 
  }),
  
  hideSpeech: () => set({ 
    speechBubble: { show: false, message: '' } 
  }),
}))

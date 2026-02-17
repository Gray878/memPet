import { create } from 'zustand'
import { PetBehavior } from '../types/electron'

interface PetState {
  // 宠物状态
  behavior: PetBehavior
  currentMessage: string
  isThinking: boolean

  // 位置信息
  position: { x: number; y: number }

  // 操作方法
  setBehavior: (behavior: PetBehavior) => void
  setMessage: (message: string) => void
  setThinking: (isThinking: boolean) => void
  setPosition: (position: { x: number; y: number }) => void
}

export const usePetStore = create<PetState>(set => ({
  // 初始状态
  behavior: 'idle',
  currentMessage: '',
  isThinking: false,
  position: { x: 100, y: 100 },

  // 操作方法
  setBehavior: behavior => set({ behavior }),
  setMessage: message => set({ currentMessage: message }),
  setThinking: isThinking => set({ isThinking }),
  setPosition: position => set({ position }),
}))

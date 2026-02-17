import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 记忆相关 API
  memorize: (data: any) => ipcRenderer.invoke('memorize', data),
  retrieve: (query: string) => ipcRenderer.invoke('retrieve', query),
  getCategories: () => ipcRenderer.invoke('get-categories'),

  // 系统监控 API
  getUserContext: () => ipcRenderer.invoke('get-user-context'),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),

  // 宠物行为 API
  setPetBehavior: (behavior: string) => ipcRenderer.invoke('set-pet-behavior', behavior),

  // 设置相关 API
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
})

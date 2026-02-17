import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload 脚本 - 暴露安全的 API 给渲染进程
 */

// 系统监控 API
const systemAPI = {
  getContext: () => ipcRenderer.invoke('system:get-context'),
  getWorkTime: () => ipcRenderer.invoke('system:get-work-time'),
  getCurrentApp: () => ipcRenderer.invoke('system:get-current-app'),
  resetWorkTime: () => ipcRenderer.invoke('system:reset-work-time'),
}

// 记忆管理 API
const memoryAPI = {
  memorizeConversation: (content: any[]) => 
    ipcRenderer.invoke('memory:memorize-conversation', content),
  memorizeObservation: (observation: any) => 
    ipcRenderer.invoke('memory:memorize-observation', observation),
  retrieveConversation: (query: string, limit?: number) => 
    ipcRenderer.invoke('memory:retrieve-conversation', query, limit),
  retrieveProactive: (context: any, limit?: number) => 
    ipcRenderer.invoke('memory:retrieve-proactive', context, limit),
  batchObservations: (observations: any[]) => 
    ipcRenderer.invoke('memory:batch-observations', observations),
  flushBuffer: () => 
    ipcRenderer.invoke('memory:flush-buffer'),
  // 自动记忆 API
  autoRecordConversation: (userMessage: string, aiResponse: string) =>
    ipcRenderer.invoke('memory:auto-record-conversation', userMessage, aiResponse),
  autoRecordActivity: (activity: string, metadata?: any) =>
    ipcRenderer.invoke('memory:auto-record-activity', activity, metadata),
  getRecent: (limit?: number) =>
    ipcRenderer.invoke('memory:get-recent', limit),
  search: (query: string, options?: any) =>
    ipcRenderer.invoke('memory:search', query, options),
  getStats: () =>
    ipcRenderer.invoke('memory:get-stats'),
}

// 宠物 API
const petAPI = {
  proactiveAnalyze: (context: any) => 
    ipcRenderer.invoke('pet:proactive-analyze', context),
  proactiveGenerate: (suggestion: any, context: any, personality?: string, limit?: number) => 
    ipcRenderer.invoke('pet:proactive-generate', suggestion, context, personality, limit),
  checkService: () => 
    ipcRenderer.invoke('pet:check-service'),
}

// 事件监听 API
const eventsAPI = {
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['open-chat', 'open-memory', 'open-settings', 'proactive-message']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  system: systemAPI,
  memory: memoryAPI,
  pet: petAPI,
  events: eventsAPI,
})

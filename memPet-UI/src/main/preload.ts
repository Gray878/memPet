const { contextBridge, ipcRenderer } = require('electron')

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

// 对话 API
const chatAPI = {
  sendMessage: (message: string) =>
    ipcRenderer.invoke('chat:send-message', message),
  sendMessageStream: (message: string) =>
    ipcRenderer.invoke('chat:send-message-stream', message),
  updateConfig: (config: any) =>
    ipcRenderer.invoke('chat:update-config', config),
  clearHistory: () =>
    ipcRenderer.invoke('chat:clear-history'),
  getHistory: () =>
    ipcRenderer.invoke('chat:get-history'),
}

// 设置 API
const settingsAPI = {
  getConfig: () => ipcRenderer.invoke('settings:get-config'),
  updateConfig: (updates: any) => ipcRenderer.invoke('settings:update-config', updates),
  resetConfig: () => ipcRenderer.invoke('settings:reset-config'),
  exportConfig: () => ipcRenderer.invoke('settings:export-config'),
  importConfig: () => ipcRenderer.invoke('settings:import-config'),
  testAPI: (config: any) => ipcRenderer.invoke('settings:test-api', config),
  getServerStatus: () => ipcRenderer.invoke('settings:get-server-status'),
  restartServer: () => ipcRenderer.invoke('settings:restart-server'),
  getLogs: (lines?: number) => ipcRenderer.invoke('settings:get-logs', lines),
  clearLogs: () => ipcRenderer.invoke('settings:clear-logs'),
  selectFolder: (title: string) => ipcRenderer.invoke('settings:select-folder', title),
}

// 事件监听 API
const eventsAPI = {
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'open-chat',
      'open-memory',
      'open-settings',
      'proactive-message',
      'chat-stream-chunk',
      'chat-stream-complete',
      'chat-stream-error',
    ]
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
  chat: chatAPI,
  settings: settingsAPI,
  events: eventsAPI,
})

// 调试日志 - 确认 preload 脚本已执行
console.log('[Preload] Script executed successfully')
console.log('[Preload] electronAPI exposed with:', {
  system: !!systemAPI,
  memory: !!memoryAPI,
  pet: !!petAPI,
  chat: !!chatAPI,
  settings: !!settingsAPI,
  events: !!eventsAPI,
})

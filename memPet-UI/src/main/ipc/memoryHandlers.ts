import { ipcMain } from 'electron'
import { MemUService } from '../services/MemUService'
import { AutoMemoryService } from '../services/AutoMemoryService'

/**
 * 记忆相关的 IPC 处理器
 */
export function registerMemoryHandlers(
  memUService: MemUService,
  autoMemoryService: AutoMemoryService
) {
  // 存储对话记忆
  ipcMain.handle('memory:memorize-conversation', async (_event, content: any[]) => {
    try {
      const result = await memUService.memorizeConversation(content)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 存储对话失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 存储系统观察
  ipcMain.handle('memory:memorize-observation', async (_event, observation: any) => {
    try {
      const result = await memUService.memorizeObservation(observation)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 存储观察失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检索对话上下文
  ipcMain.handle('memory:retrieve-conversation', async (_event, query: string, limit?: number) => {
    try {
      const result = await memUService.retrieveConversation(query, limit)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 检索对话失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检索主动推理上下文
  ipcMain.handle('memory:retrieve-proactive', async (_event, context: any, limit?: number) => {
    try {
      const result = await memUService.retrieveProactive(context, limit)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 检索主动推理上下文失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 批量添加观察记录
  ipcMain.handle('memory:batch-observations', async (_event, observations: any[]) => {
    try {
      const result = await memUService.batchObservations(observations)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 批量添加观察失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 刷新缓冲区
  ipcMain.handle('memory:flush-buffer', async () => {
    try {
      const result = await memUService.flushBuffer()
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 刷新缓冲区失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 自动记录对话
  ipcMain.handle('memory:auto-record-conversation', async (_event, userMessage: string, aiResponse: string) => {
    try {
      await autoMemoryService.recordConversation(userMessage, aiResponse)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 自动记录对话失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 自动记录活动
  ipcMain.handle('memory:auto-record-activity', async (_event, activity: string, metadata?: any) => {
    try {
      await autoMemoryService.recordActivity(activity, metadata)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 自动记录活动失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取最近记忆
  ipcMain.handle('memory:get-recent', async (_event, limit?: number) => {
    try {
      const result = await autoMemoryService.getRecentMemories(limit)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 获取最近记忆失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 搜索记忆
  ipcMain.handle('memory:search', async (_event, query: string, options?: any) => {
    try {
      const result = await autoMemoryService.searchMemories(query, options)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 搜索记忆失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取统计信息
  ipcMain.handle('memory:get-stats', async () => {
    try {
      const result = autoMemoryService.getStats()
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 获取统计信息失败:', error)
      return { success: false, error: error.message }
    }
  })
}

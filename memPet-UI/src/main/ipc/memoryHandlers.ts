import { ipcMain } from 'electron'
import { MemUService } from '../services/MemUService'

/**
 * 记忆相关的 IPC 处理器
 */
export function registerMemoryHandlers(memUService: MemUService) {
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
}

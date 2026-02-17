import { ipcMain } from 'electron'
import { MemUService } from '../services/MemUService'

/**
 * 宠物相关的 IPC 处理器
 */
export function registerPetHandlers(memUService: MemUService) {
  // 主动推理分析
  ipcMain.handle('pet:proactive-analyze', async (_event, context: any) => {
    try {
      const result = await memUService.proactiveAnalyze(context)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 主动推理分析失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 生成主动推理消息
  ipcMain.handle('pet:proactive-generate', async (_event, suggestion: any, context: any, personality?: string, limit?: number) => {
    try {
      const result = await memUService.proactiveGenerate(suggestion, context, personality, limit)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('[IPC] 生成主动推理消息失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检查服务状态
  ipcMain.handle('pet:check-service', async () => {
    try {
      const isReady = memUService.isServiceReady()
      return { success: true, data: { isReady } }
    } catch (error: any) {
      console.error('[IPC] 检查服务状态失败:', error)
      return { success: false, error: error.message }
    }
  })
}

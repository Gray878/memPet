import { ipcMain } from 'electron'
import { ChatService } from '../services/ChatService'

/**
 * 对话相关的 IPC 处理器
 */
export function registerChatHandlers(chatService: ChatService) {
  // 发送消息(非流式)
  ipcMain.handle('chat:send-message', async (_event, message: string) => {
    try {
      const response = await chatService.chat(message)
      return { success: true, data: response }
    } catch (error: any) {
      console.error('[IPC] 发送消息失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 发送消息(流式)
  ipcMain.handle('chat:send-message-stream', async (_event, message: string) => {
    try {
      await chatService.chatStream(message)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 流式发送消息失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 更新配置
  ipcMain.handle('chat:update-config', async (_event, config: any) => {
    try {
      chatService.updateConfig(config)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 更新配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 清空对话历史
  ipcMain.handle('chat:clear-history', async () => {
    try {
      chatService.clearHistory()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 清空历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取对话历史
  ipcMain.handle('chat:get-history', async () => {
    try {
      const history = chatService.getHistory()
      return { success: true, data: history }
    } catch (error: any) {
      console.error('[IPC] 获取历史失败:', error)
      return { success: false, error: error.message }
    }
  })
}

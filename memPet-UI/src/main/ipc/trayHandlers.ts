import { ipcMain } from 'electron'
import { TrayService } from '../services/TrayService'
import { NotificationService } from '../services/NotificationService'
import { ShortcutService } from '../services/ShortcutService'

/**
 * 托盘、通知和快捷键相关的 IPC 处理器
 */
export function registerTrayHandlers(
  trayService: TrayService | null,
  notificationService: NotificationService | null,
  shortcutService: ShortcutService | null
) {
  // ========== 托盘相关 ==========
  
  // 更新托盘菜单
  ipcMain.handle('tray:update-menu', async (_event, options: any) => {
    try {
      trayService?.updateContextMenu(options)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 更新托盘菜单失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 显示托盘通知
  ipcMain.handle('tray:show-notification', async (_event, title: string, body: string) => {
    try {
      trayService?.showNotification(title, body)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 显示托盘通知失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ========== 通知相关 ==========
  
  // 显示通知
  ipcMain.handle('notification:show', async (_event, type: string, title: string, body: string, options?: any) => {
    try {
      notificationService?.show(type as any, title, body, options)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 显示通知失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 显示主动推理通知
  ipcMain.handle('notification:show-proactive', async (_event, message: string, suggestion?: string) => {
    try {
      notificationService?.showProactive(message, suggestion)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 显示主动推理通知失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 更新通知配置
  ipcMain.handle('notification:update-config', async (_event, config: any) => {
    try {
      notificationService?.updateConfig(config)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 更新通知配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取通知配置
  ipcMain.handle('notification:get-config', async () => {
    try {
      const config = notificationService?.getConfig()
      return { success: true, data: config }
    } catch (error: any) {
      console.error('[IPC] 获取通知配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取通知历史
  ipcMain.handle('notification:get-history', async (_event, limit?: number) => {
    try {
      const history = notificationService?.getHistory(limit)
      return { success: true, data: history }
    } catch (error: any) {
      console.error('[IPC] 获取通知历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 标记为已读
  ipcMain.handle('notification:mark-read', async (_event, id: string) => {
    try {
      notificationService?.markAsRead(id)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 标记已读失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 清空历史
  ipcMain.handle('notification:clear-history', async () => {
    try {
      notificationService?.clearHistory()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 清空历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取未读数量
  ipcMain.handle('notification:get-unread-count', async () => {
    try {
      const count = notificationService?.getUnreadCount() ?? 0
      return { success: true, data: count }
    } catch (error: any) {
      console.error('[IPC] 获取未读数量失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ========== 快捷键相关 ==========
  
  // 获取快捷键配置
  ipcMain.handle('shortcut:get-config', async () => {
    try {
      const shortcuts = shortcutService?.getShortcuts()
      return { success: true, data: shortcuts }
    } catch (error: any) {
      console.error('[IPC] 获取快捷键配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 更新快捷键配置
  ipcMain.handle('shortcut:update-config', async (_event, shortcuts: any) => {
    try {
      shortcutService?.updateShortcuts(shortcuts)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 更新快捷键配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检查快捷键是否已注册
  ipcMain.handle('shortcut:is-registered', async (_event, accelerator: string) => {
    try {
      const isRegistered = shortcutService?.isRegistered(accelerator) ?? false
      return { success: true, data: isRegistered }
    } catch (error: any) {
      console.error('[IPC] 检查快捷键失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 验证快捷键格式
  ipcMain.handle('shortcut:validate', async (_event, accelerator: string) => {
    try {
      const isValid = ShortcutService.validateShortcut(accelerator)
      return { success: true, data: isValid }
    } catch (error: any) {
      console.error('[IPC] 验证快捷键失败:', error)
      return { success: false, error: error.message }
    }
  })
}

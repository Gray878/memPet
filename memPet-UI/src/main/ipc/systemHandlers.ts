import { ipcMain } from 'electron'
import { SystemMonitor } from '../services/SystemMonitor'

/**
 * 系统监控相关的 IPC 处理器
 */
export function registerSystemHandlers(systemMonitor: SystemMonitor) {
  // 获取系统上下文
  ipcMain.handle('system:get-context', async () => {
    try {
      const context = systemMonitor.getSystemContext()
      return { success: true, data: context }
    } catch (error: any) {
      console.error('[IPC] 获取系统上下文失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取工作时长
  ipcMain.handle('system:get-work-time', async () => {
    try {
      const workTime = systemMonitor.getWorkTime()
      return { success: true, data: workTime }
    } catch (error: any) {
      console.error('[IPC] 获取工作时长失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取当前活动应用
  ipcMain.handle('system:get-current-app', async () => {
    try {
      const app = systemMonitor.getCurrentApp()
      return { success: true, data: app }
    } catch (error: any) {
      console.error('[IPC] 获取当前应用失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重置工作时间
  ipcMain.handle('system:reset-work-time', async () => {
    try {
      systemMonitor.resetWorkTime()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 重置工作时间失败:', error)
      return { success: false, error: error.message }
    }
  })
}

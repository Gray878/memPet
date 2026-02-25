import { ipcMain, dialog } from 'electron'
import { ConfigService } from '../services/ConfigService'
import { MemUService } from '../services/MemUService'

/**
 * 设置相关的 IPC 处理器
 */
export function registerSettingsHandlers(
  configService: ConfigService,
  memUService: MemUService
) {
  // 获取配置
  ipcMain.handle('settings:get-config', async () => {
    try {
      const config = configService.get()
      return { success: true, data: config }
    } catch (error: any) {
      console.error('[IPC] 获取配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 更新配置
  ipcMain.handle('settings:update-config', async (_event, updates: any) => {
    try {
      await configService.update(updates)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 更新配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重置配置
  ipcMain.handle('settings:reset-config', async () => {
    try {
      await configService.reset()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 重置配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 导出配置
  ipcMain.handle('settings:export-config', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出配置',
        defaultPath: 'mempet-config.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消' }
      }

      await configService.export(result.filePath)
      return { success: true, path: result.filePath }
    } catch (error: any) {
      console.error('[IPC] 导出配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 导入配置
  ipcMain.handle('settings:import-config', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入配置',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消' }
      }

      await configService.import(result.filePaths[0])
      return { success: true, path: result.filePaths[0] }
    } catch (error: any) {
      console.error('[IPC] 导入配置失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 测试 API 连接
  ipcMain.handle('settings:test-api', async (_event, config: any) => {
    try {
      // 简单的连接测试
      const response = await fetch(`${config.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      })

      if (response.ok) {
        return { success: true, message: 'API 连接成功' }
      } else {
        return { success: false, error: `API 返回错误: ${response.status}` }
      }
    } catch (error: any) {
      console.error('[IPC] API 测试失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取 memPet-server 状态
  ipcMain.handle('settings:get-server-status', async () => {
    try {
      const isRunning = memUService.isRunning()
      return { success: true, data: { running: isRunning } }
    } catch (error: any) {
      console.error('[IPC] 获取服务状态失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重启 memPet-server
  ipcMain.handle('settings:restart-server', async () => {
    try {
      await memUService.restart()
      return { success: true, message: '服务重启成功' }
    } catch (error: any) {
      console.error('[IPC] 重启服务失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取日志
  ipcMain.handle('settings:get-logs', async (_event, lines: number = 100) => {
    try {
      const logs = memUService.getLogs(lines)
      return { success: true, data: logs }
    } catch (error: any) {
      console.error('[IPC] 获取日志失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 清空日志
  ipcMain.handle('settings:clear-logs', async () => {
    try {
      memUService.clearLogs()
      return { success: true, message: '日志已清空' }
    } catch (error: any) {
      console.error('[IPC] 清空日志失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 选择文件夹
  ipcMain.handle('settings:select-folder', async (_event, title: string) => {
    try {
      const result = await dialog.showOpenDialog({
        title,
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消' }
      }

      return { success: true, path: result.filePaths[0] }
    } catch (error: any) {
      console.error('[IPC] 选择文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })
}

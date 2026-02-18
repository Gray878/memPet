import { globalShortcut, BrowserWindow } from 'electron'

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
  showHide: string
  openChat: string
  openMemory: string
  openSettings: string
  quickNote: string
}

/**
 * 默认快捷键配置
 */
const DEFAULT_SHORTCUTS: ShortcutConfig = {
  showHide: 'CommandOrControl+Shift+P',
  openChat: 'CommandOrControl+Shift+C',
  openMemory: 'CommandOrControl+Shift+M',
  openSettings: 'CommandOrControl+,',
  quickNote: 'CommandOrControl+Shift+N',
}

/**
 * 快捷键服务类
 * 管理全局快捷键
 */
export class ShortcutService {
  private mainWindow: BrowserWindow | null = null
  private shortcuts: ShortcutConfig
  private registeredShortcuts: Set<string> = new Set()

  constructor(shortcuts?: Partial<ShortcutConfig>) {
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts }
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * 注册所有快捷键
   */
  registerAll(): boolean {
    try {
      // 显示/隐藏宠物
      this.register(this.shortcuts.showHide, () => {
        this.toggleWindow()
      })

      // 打开对话
      this.register(this.shortcuts.openChat, () => {
        this.showWindow()
        this.mainWindow?.webContents.send('open-chat')
      })

      // 打开记忆
      this.register(this.shortcuts.openMemory, () => {
        this.showWindow()
        this.mainWindow?.webContents.send('open-memory')
      })

      // 打开设置
      this.register(this.shortcuts.openSettings, () => {
        this.showWindow()
        this.mainWindow?.webContents.send('open-settings')
      })

      // 快速记录
      this.register(this.shortcuts.quickNote, () => {
        this.showWindow()
        this.mainWindow?.webContents.send('quick-note')
      })

      console.log('[ShortcutService] 快捷键注册成功')
      return true
    } catch (error) {
      console.error('[ShortcutService] 快捷键注册失败:', error)
      return false
    }
  }

  /**
   * 注册单个快捷键
   */
  private register(accelerator: string, callback: () => void): boolean {
    try {
      const success = globalShortcut.register(accelerator, callback)
      if (success) {
        this.registeredShortcuts.add(accelerator)
        console.log(`[ShortcutService] 注册快捷键: ${accelerator}`)
      } else {
        console.warn(`[ShortcutService] 快捷键已被占用: ${accelerator}`)
      }
      return success
    } catch (error) {
      console.error(`[ShortcutService] 注册快捷键失败 ${accelerator}:`, error)
      return false
    }
  }

  /**
   * 注销单个快捷键
   */
  unregister(accelerator: string) {
    globalShortcut.unregister(accelerator)
    this.registeredShortcuts.delete(accelerator)
    console.log(`[ShortcutService] 注销快捷键: ${accelerator}`)
  }

  /**
   * 注销所有快捷键
   */
  unregisterAll() {
    globalShortcut.unregisterAll()
    this.registeredShortcuts.clear()
    console.log('[ShortcutService] 所有快捷键已注销')
  }

  /**
   * 更新快捷键配置
   */
  updateShortcuts(newShortcuts: Partial<ShortcutConfig>) {
    // 注销旧快捷键
    this.unregisterAll()
    
    // 更新配置
    this.shortcuts = { ...this.shortcuts, ...newShortcuts }
    
    // 重新注册
    this.registerAll()
  }

  /**
   * 检查快捷键是否已注册
   */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator)
  }

  /**
   * 获取当前快捷键配置
   */
  getShortcuts(): ShortcutConfig {
    return { ...this.shortcuts }
  }

  /**
   * 显示窗口
   */
  private showWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  /**
   * 切换窗口显示/隐藏
   */
  private toggleWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide()
      } else {
        this.showWindow()
      }
    }
  }

  /**
   * 验证快捷键格式
   */
  static validateShortcut(accelerator: string): boolean {
    try {
      // 尝试注册并立即注销来验证格式
      const success = globalShortcut.register(accelerator, () => {})
      if (success) {
        globalShortcut.unregister(accelerator)
        return true
      }
      return false
    } catch {
      return false
    }
  }
}

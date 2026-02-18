import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

/**
 * 托盘服务类
 * 管理系统托盘图标和菜单
 */
export class TrayService {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null

  constructor() {}

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * 创建托盘
   */
  create() {
    try {
      // 加载托盘图标
      const iconPath = this.getTrayIconPath()
      const icon = nativeImage.createFromPath(iconPath)
      
      // 创建托盘
      this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
      
      // 设置工具提示
      this.tray.setToolTip('memPet - 智能桌面宠物')
      
      // 创建上下文菜单
      this.updateContextMenu()
      
      // 双击托盘图标显示/隐藏窗口
      this.tray.on('double-click', () => {
        this.toggleWindow()
      })
      
      console.log('[TrayService] 托盘创建成功')
    } catch (error) {
      console.error('[TrayService] 托盘创建失败:', error)
      // 创建一个空图标作为降级方案
      this.tray = new Tray(nativeImage.createEmpty())
      this.updateContextMenu()
    }
  }

  /**
   * 更新上下文菜单
   */
  updateContextMenu(options?: { proactiveEnabled?: boolean }) {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示宠物',
        click: () => this.showWindow(),
        accelerator: 'CommandOrControl+Shift+P'
      },
      { type: 'separator' },
      {
        label: '打开对话',
        click: () => this.openChat(),
        accelerator: 'CommandOrControl+Shift+C'
      },
      {
        label: '查看记忆',
        click: () => this.openMemory(),
        accelerator: 'CommandOrControl+Shift+M'
      },
      {
        label: '设置',
        click: () => this.openSettings(),
        accelerator: 'CommandOrControl+,'
      },
      { type: 'separator' },
      {
        label: '主动推理',
        type: 'checkbox',
        checked: options?.proactiveEnabled ?? true,
        click: (menuItem) => {
          this.toggleProactive(menuItem.checked)
        }
      },
      { type: 'separator' },
      {
        label: '关于',
        click: () => this.showAbout()
      },
      {
        label: '退出',
        click: () => this.quit(),
        accelerator: 'CommandOrControl+Q'
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /**
   * 获取托盘图标路径
   */
  private getTrayIconPath(): string {
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      // 开发环境
      return path.join(process.cwd(), 'resources', 'tray-icon.png')
    } else {
      // 生产环境
      return path.join(process.resourcesPath, 'tray-icon.png')
    }
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
   * 打开对话窗口
   */
  private openChat() {
    this.showWindow()
    if (this.mainWindow) {
      this.mainWindow.webContents.send('open-chat')
    }
  }

  /**
   * 打开记忆浏览器
   */
  private openMemory() {
    this.showWindow()
    if (this.mainWindow) {
      this.mainWindow.webContents.send('open-memory')
    }
  }

  /**
   * 打开设置
   */
  private openSettings() {
    this.showWindow()
    if (this.mainWindow) {
      this.mainWindow.webContents.send('open-settings')
    }
  }

  /**
   * 切换主动推理
   */
  private toggleProactive(enabled: boolean) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('toggle-proactive', enabled)
    }
  }

  /**
   * 显示关于对话框
   */
  private showAbout() {
    const { dialog } = require('electron')
    dialog.showMessageBox({
      type: 'info',
      title: '关于 memPet',
      message: 'memPet',
      detail: `版本: ${app.getVersion()}\n智能桌面宠物应用\n基于 memU 记忆系统\n\n© 2026 memPet Team`,
      buttons: ['确定']
    })
  }

  /**
   * 退出应用
   */
  private quit() {
    app.quit()
  }

  /**
   * 显示气泡通知
   */
  showNotification(title: string, body: string) {
    if (this.tray) {
      this.tray.displayBalloon({
        title,
        content: body,
        icon: nativeImage.createFromPath(this.getTrayIconPath())
      })
    }
  }

  /**
   * 更新托盘图标
   */
  updateIcon(iconPath: string) {
    if (this.tray) {
      const icon = nativeImage.createFromPath(iconPath)
      this.tray.setImage(icon.resize({ width: 16, height: 16 }))
    }
  }

  /**
   * 销毁托盘
   */
  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
      console.log('[TrayService] 托盘已销毁')
    }
  }
}

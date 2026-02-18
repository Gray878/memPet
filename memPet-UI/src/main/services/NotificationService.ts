import { Notification, nativeImage } from 'electron'
import path from 'path'

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'proactive'

/**
 * 通知配置
 */
export interface NotificationConfig {
  enabled: boolean
  sound: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

/**
 * 通知历史记录
 */
export interface NotificationHistory {
  id: string
  type: NotificationType
  title: string
  body: string
  timestamp: Date
  read: boolean
}

/**
 * 通知服务类
 * 管理系统通知
 */
export class NotificationService {
  private config: NotificationConfig
  private history: NotificationHistory[] = []
  private readonly MAX_HISTORY = 50

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      sound: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      ...config
    }
  }

  /**
   * 显示通知
   */
  show(
    type: NotificationType,
    title: string,
    body: string,
    options?: {
      silent?: boolean
      urgency?: 'normal' | 'critical' | 'low'
      actions?: { type: string; text: string }[]
    }
  ): Notification | null {
    // 检查是否启用通知
    if (!this.config.enabled) {
      console.log('[NotificationService] 通知已禁用')
      return null
    }

    // 检查免打扰时段
    if (this.isQuietHours()) {
      console.log('[NotificationService] 当前处于免打扰时段')
      return null
    }

    try {
      const notification = new Notification({
        title,
        body,
        icon: this.getIconPath(),
        silent: options?.silent ?? !this.config.sound,
        urgency: options?.urgency ?? 'normal',
        actions: options?.actions,
      })

      notification.show()

      // 添加到历史记录
      this.addToHistory(type, title, body)

      console.log(`[NotificationService] 显示通知: ${title}`)
      return notification
    } catch (error) {
      console.error('[NotificationService] 显示通知失败:', error)
      return null
    }
  }

  /**
   * 显示主动推理通知
   */
  showProactive(message: string, suggestion?: string): Notification | null {
    return this.show(
      'proactive',
      'memPet 提醒',
      message,
      {
        urgency: 'normal',
        actions: suggestion ? [
          { type: 'view', text: '查看详情' },
          { type: 'dismiss', text: '忽略' }
        ] : undefined
      }
    )
  }

  /**
   * 显示成功通知
   */
  showSuccess(title: string, body: string): Notification | null {
    return this.show('success', title, body, { urgency: 'low' })
  }

  /**
   * 显示警告通知
   */
  showWarning(title: string, body: string): Notification | null {
    return this.show('warning', title, body, { urgency: 'normal' })
  }

  /**
   * 显示错误通知
   */
  showError(title: string, body: string): Notification | null {
    return this.show('error', title, body, { urgency: 'critical' })
  }

  /**
   * 显示信息通知
   */
  showInfo(title: string, body: string): Notification | null {
    return this.show('info', title, body, { urgency: 'low' })
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config }
    console.log('[NotificationService] 配置已更新')
  }

  /**
   * 获取配置
   */
  getConfig(): NotificationConfig {
    return { ...this.config }
  }

  /**
   * 检查是否在免打扰时段
   */
  private isQuietHours(): boolean {
    if (!this.config.quietHoursEnabled) {
      return false
    }

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const start = this.config.quietHoursStart
    const end = this.config.quietHoursEnd

    // 处理跨天的情况
    if (start <= end) {
      return currentTime >= start && currentTime < end
    } else {
      return currentTime >= start || currentTime < end
    }
  }

  /**
   * 获取图标路径
   */
  private getIconPath(): string {
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      return path.join(process.cwd(), 'resources', 'tray-icon.png')
    } else {
      return path.join(process.resourcesPath, 'tray-icon.png')
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(type: NotificationType, title: string, body: string) {
    const notification: NotificationHistory = {
      id: Date.now().toString(),
      type,
      title,
      body,
      timestamp: new Date(),
      read: false
    }

    this.history.unshift(notification)

    // 保持历史记录在限制内
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(0, this.MAX_HISTORY)
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(limit?: number): NotificationHistory[] {
    if (limit) {
      return this.history.slice(0, limit)
    }
    return [...this.history]
  }

  /**
   * 标记为已读
   */
  markAsRead(id: string) {
    const notification = this.history.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  /**
   * 标记所有为已读
   */
  markAllAsRead() {
    this.history.forEach(n => n.read = true)
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this.history = []
    console.log('[NotificationService] 历史记录已清空')
  }

  /**
   * 获取未读数量
   */
  getUnreadCount(): number {
    return this.history.filter(n => !n.read).length
  }
}

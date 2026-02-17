/**
 * 主动推理服务
 * 负责定期检查系统状态，生成主动建议并通知用户
 */

import { BrowserWindow } from 'electron'
import { MemUService } from './MemUService'
import { SystemMonitor } from './SystemMonitor'

export interface Suggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  message: string
  reason: string
  action: string
}

export interface ProactiveConfig {
  enabled: boolean
  checkInterval: number // 检查间隔（毫秒）
  personality: 'friendly' | 'energetic' | 'professional' | 'tsundere'
  minPriority: 'high' | 'medium' | 'low' // 最低触发优先级
}

export class ProactiveService {
  private memUService: MemUService
  private systemMonitor: SystemMonitor
  private mainWindow: BrowserWindow | null = null
  private checkIntervalId: NodeJS.Timeout | null = null
  private isRunning = false

  // 默认配置
  private config: ProactiveConfig = {
    enabled: true,
    checkInterval: 5 * 60 * 1000, // 5分钟
    personality: 'friendly',
    minPriority: 'medium',
  }

  constructor(memUService: MemUService, systemMonitor: SystemMonitor) {
    this.memUService = memUService
    this.systemMonitor = systemMonitor
  }

  /**
   * 设置主窗口引用（用于发送通知）
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProactiveConfig>) {
    this.config = { ...this.config, ...config }
    
    // 如果修改了检查间隔，重启服务
    if (config.checkInterval && this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ProactiveConfig {
    return { ...this.config }
  }

  /**
   * 启动主动推理服务
   */
  start() {
    if (this.isRunning) {
      console.log('[ProactiveService] 服务已在运行')
      return
    }

    if (!this.config.enabled) {
      console.log('[ProactiveService] 服务已禁用')
      return
    }

    console.log('[ProactiveService] 启动主动推理服务...')
    this.isRunning = true

    // 立即执行一次检查
    this.checkAndNotify()

    // 定期检查
    this.checkIntervalId = setInterval(() => {
      this.checkAndNotify()
    }, this.config.checkInterval)

    console.log(`[ProactiveService] 服务已启动，检查间隔: ${this.config.checkInterval / 1000}秒`)
  }

  /**
   * 停止主动推理服务
   */
  stop() {
    if (!this.isRunning) return

    console.log('[ProactiveService] 停止主动推理服务...')
    this.isRunning = false

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
    }

    console.log('[ProactiveService] 服务已停止')
  }

  /**
   * 检查并通知
   */
  private async checkAndNotify() {
    try {
      console.log('[ProactiveService] 开始检查...')

      // 1. 获取系统上下文
      const context = this.systemMonitor.getSystemContext()
      console.log('[ProactiveService] 系统上下文:', context)

      // 2. 分析上下文，获取建议
      const result = await this.memUService.proactiveAnalyze(context)
      const suggestions: Suggestion[] = result.suggestions || []

      if (suggestions.length === 0) {
        console.log('[ProactiveService] 无建议')
        return
      }

      console.log(`[ProactiveService] 获得 ${suggestions.length} 条建议`)

      // 3. 过滤建议（根据优先级）
      const filteredSuggestions = this.filterSuggestionsByPriority(suggestions)

      if (filteredSuggestions.length === 0) {
        console.log('[ProactiveService] 无符合优先级的建议')
        return
      }

      // 4. 选择优先级最高的建议
      const suggestion = this.selectBestSuggestion(filteredSuggestions)
      console.log('[ProactiveService] 选择建议:', suggestion.type, suggestion.priority)

      // 5. 生成自然语言消息
      const generateResult = await this.memUService.proactiveGenerate(
        suggestion,
        context,
        this.config.personality,
        3
      )

      const message = generateResult.message
      console.log('[ProactiveService] 生成消息:', message)

      // 6. 发送通知到渲染进程
      this.notifyRenderer({
        suggestion,
        message,
        context,
        timestamp: new Date().toISOString(),
      })

    } catch (error) {
      console.error('[ProactiveService] 检查失败:', error)
    }
  }

  /**
   * 根据优先级过滤建议
   */
  private filterSuggestionsByPriority(suggestions: Suggestion[]): Suggestion[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const minPriorityValue = priorityOrder[this.config.minPriority]

    return suggestions.filter(s => {
      const priority = priorityOrder[s.priority as keyof typeof priorityOrder] || 0
      return priority >= minPriorityValue
    })
  }

  /**
   * 选择最佳建议（优先级最高的）
   */
  private selectBestSuggestion(suggestions: Suggestion[]): Suggestion {
    const priorityOrder = { high: 3, medium: 2, low: 1 }

    return suggestions.reduce((best, current) => {
      const bestPriority = priorityOrder[best.priority as keyof typeof priorityOrder] || 0
      const currentPriority = priorityOrder[current.priority as keyof typeof priorityOrder] || 0
      return currentPriority > bestPriority ? current : best
    })
  }

  /**
   * 发送通知到渲染进程
   */
  private notifyRenderer(data: any) {
    if (!this.mainWindow) {
      console.warn('[ProactiveService] 主窗口未设置，无法发送通知')
      return
    }

    try {
      this.mainWindow.webContents.send('proactive-message', data)
      console.log('[ProactiveService] 通知已发送')
    } catch (error) {
      console.error('[ProactiveService] 发送通知失败:', error)
    }
  }

  /**
   * 手动触发检查（用于测试）
   */
  async triggerCheck() {
    console.log('[ProactiveService] 手动触发检查')
    await this.checkAndNotify()
  }

  /**
   * 获取冷却状态
   */
  async getCooldownStatus() {
    try {
      const result = await this.memUService.getCooldownStatus()
      return result.cooldowns || {}
    } catch (error) {
      console.error('[ProactiveService] 获取冷却状态失败:', error)
      return {}
    }
  }

  /**
   * 重置冷却时间
   */
  async resetCooldown(type?: string) {
    try {
      await this.memUService.resetCooldown(type)
      console.log(`[ProactiveService] 冷却时间已重置: ${type || '全部'}`)
    } catch (error) {
      console.error('[ProactiveService] 重置冷却时间失败:', error)
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      hasMainWindow: !!this.mainWindow,
    }
  }
}

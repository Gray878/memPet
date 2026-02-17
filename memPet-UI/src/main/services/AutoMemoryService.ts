/**
 * 自动记忆服务
 * 负责自动记录用户活动、对话内容和系统事件
 */

import { MemUService } from './MemUService'
import { SystemMonitor } from './SystemMonitor'

export interface MemoryEvent {
  type: 'activity' | 'conversation' | 'system'
  content: string
  metadata?: Record<string, any>
  timestamp?: Date
}

export class AutoMemoryService {
  private memUService: MemUService
  private systemMonitor: SystemMonitor
  private conversationBuffer: MemoryEvent[] = []
  private isRunning = false

  // 配置
  private readonly CONVERSATION_BUFFER_SIZE = 5 // 对话缓冲区大小
  private readonly AUTO_FLUSH_INTERVAL = 60000 // 1分钟自动刷新

  constructor(memUService: MemUService, systemMonitor: SystemMonitor) {
    this.memUService = memUService
    this.systemMonitor = systemMonitor
  }

  /**
   * 启动自动记忆服务
   */
  start() {
    if (this.isRunning) {
      console.log('[AutoMemory] 服务已在运行')
      return
    }

    console.log('[AutoMemory] 启动自动记忆服务...')
    this.isRunning = true

    // 定期刷新对话缓冲区
    setInterval(() => {
      this.flushConversationBuffer()
    }, this.AUTO_FLUSH_INTERVAL)

    console.log('[AutoMemory] 自动记忆服务已启动')
  }

  /**
   * 停止自动记忆服务
   */
  stop() {
    if (!this.isRunning) return

    console.log('[AutoMemory] 停止自动记忆服务...')
    this.isRunning = false

    // 刷新剩余缓冲区
    this.flushConversationBuffer()
    console.log('[AutoMemory] 自动记忆服务已停止')
  }

  /**
   * 记录对话内容
   */
  async recordConversation(userMessage: string, aiResponse: string) {
    try {
      const event: MemoryEvent = {
        type: 'conversation',
        content: `用户: ${userMessage}\nAI: ${aiResponse}`,
        metadata: {
          userMessage,
          aiResponse,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      }

      // 添加到缓冲区
      this.conversationBuffer.push(event)

      // 如果缓冲区满了，立即刷新
      if (this.conversationBuffer.length >= this.CONVERSATION_BUFFER_SIZE) {
        await this.flushConversationBuffer()
      }

      console.log('[AutoMemory] 对话已记录到缓冲区')
    } catch (error) {
      console.error('[AutoMemory] 记录对话失败:', error)
    }
  }

  /**
   * 记录用户活动
   */
  async recordActivity(activity: string, metadata?: Record<string, any>) {
    try {
      await this.memUService.memorizeObservation(activity, metadata)
      console.log('[AutoMemory] 活动已记录:', activity)
    } catch (error) {
      console.error('[AutoMemory] 记录活动失败:', error)
    }
  }

  /**
   * 记录系统事件
   */
  async recordSystemEvent(event: string, metadata?: Record<string, any>) {
    try {
      const content = `[系统事件] ${event}`
      await this.memUService.memorizeObservation(content, {
        ...metadata,
        eventType: 'system',
      })
      console.log('[AutoMemory] 系统事件已记录:', event)
    } catch (error) {
      console.error('[AutoMemory] 记录系统事件失败:', error)
    }
  }

  /**
   * 刷新对话缓冲区
   */
  private async flushConversationBuffer() {
    if (this.conversationBuffer.length === 0) return

    try {
      console.log(`[AutoMemory] 刷新对话缓冲区 (${this.conversationBuffer.length} 条)`)

      // 批量存储对话
      for (const event of this.conversationBuffer) {
        await this.memUService.memorizeConversation(
          event.metadata?.userMessage || '',
          event.metadata?.aiResponse || ''
        )
      }

      // 清空缓冲区
      this.conversationBuffer = []
      console.log('[AutoMemory] 对话缓冲区已刷新')
    } catch (error) {
      console.error('[AutoMemory] 刷新对话缓冲区失败:', error)
    }
  }

  /**
   * 获取最近的记忆
   */
  async getRecentMemories(limit: number = 10) {
    try {
      const context = await this.systemMonitor.getContext()
      const query = `最近的活动和对话`

      const result = await this.memUService.retrieveForConversation(query, {
        limit,
        context: context.currentApp,
      })

      return result
    } catch (error) {
      console.error('[AutoMemory] 获取最近记忆失败:', error)
      return []
    }
  }

  /**
   * 搜索记忆
   */
  async searchMemories(query: string, options?: { limit?: number; type?: string }) {
    try {
      const result = await this.memUService.retrieveForConversation(query, {
        limit: options?.limit || 20,
      })

      // 如果指定了类型，进行过滤
      if (options?.type) {
        return result.filter((memory: any) => {
          const metadata = memory.metadata || {}
          return metadata.type === options.type || metadata.eventType === options.type
        })
      }

      return result
    } catch (error) {
      console.error('[AutoMemory] 搜索记忆失败:', error)
      return []
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      conversationBufferSize: this.conversationBuffer.length,
      isRunning: this.isRunning,
    }
  }
}

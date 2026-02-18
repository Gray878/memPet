import { BrowserWindow } from 'electron'
import { MemUService } from './MemUService'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatConfig {
  apiKey: string
  baseURL: string
  model: string
  temperature: number
  maxTokens: number
  personality: string
}

/**
 * 对话服务类
 * 负责与 LLM API 交互,实现记忆增强对话
 */
export class ChatService {
  private memUService: MemUService
  private mainWindow: BrowserWindow | null = null
  private config: ChatConfig
  private conversationHistory: ChatMessage[] = []
  private readonly MAX_HISTORY = 20

  constructor(memUService: MemUService) {
    this.memUService = memUService
    
    // 默认配置
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000,
      personality: 'friendly',
    }
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ChatConfig>) {
    this.config = { ...this.config, ...config }
    console.log('[ChatService] 配置已更新:', this.config)
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    const personalities = {
      friendly: '你是一个友好、温暖的桌面宠物助手,名叫 memPet。你会用轻松愉快的语气与用户交流,关心用户的工作和生活。',
      energetic: '你是一个充满活力、积极向上的桌面宠物助手,名叫 memPet。你总是充满热情,用鼓励的话语激励用户。',
      professional: '你是一个专业、高效的桌面助手,名叫 memPet。你会用简洁明了的语言提供帮助,注重效率和准确性。',
      tsundere: '你是一个表面高冷但内心温柔的桌面宠物,名叫 memPet。你会用略带傲娇的语气说话,但实际上很关心用户。',
    }

    const basePrompt = personalities[this.config.personality as keyof typeof personalities] || personalities.friendly

    return `${basePrompt}

你具有记忆能力,可以记住与用户的对话历史和用户的活动。当用户提到过去的事情时,你可以回忆起来。

回复时请注意:
1. 保持简洁,避免过长的回复
2. 使用自然、口语化的表达
3. 适当使用 emoji 增加亲和力
4. 如果用户问到你不知道的事情,诚实地说不知道
5. 根据上下文和记忆提供个性化的回复`
  }

  /**
   * 发送消息并获取回复
   */
  async chat(userMessage: string): Promise<string> {
    try {
      console.log('[ChatService] 收到用户消息:', userMessage)

      // 1. 检索相关记忆
      const relevantMemories = await this.retrieveRelevantMemories(userMessage)
      console.log('[ChatService] 检索到相关记忆:', relevantMemories.length, '条')

      // 2. 构建消息列表
      const messages = this.buildMessages(userMessage, relevantMemories)

      // 3. 调用 LLM API
      const response = await this.callLLM(messages)
      console.log('[ChatService] LLM 回复:', response)

      // 4. 更新对话历史
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      )

      // 保持历史记录在限制内
      if (this.conversationHistory.length > this.MAX_HISTORY) {
        this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY)
      }

      // 5. 自动记忆对话 (memU-server 已自动处理)

      return response

    } catch (error: any) {
      console.error('[ChatService] 对话失败:', error)
      throw new Error(`对话失败: ${error.message}`)
    }
  }

  /**
   * 流式对话 (使用普通 API + 前端模拟流式)
   */
  async chatStream(userMessage: string): Promise<void> {
    try {
      console.log('[ChatService] 开始流式对话:', userMessage)

      // 1. 检索相关记忆
      const relevantMemories = await this.retrieveRelevantMemories(userMessage)

      // 2. 构建消息列表
      const messages = this.buildMessages(userMessage, relevantMemories)

      // 3. 调用普通 API (非流式)
      const response = await this.callLLM(messages)

      // 4. 模拟流式输出 - 按字符分块发送
      const chunkSize = 5 // 每次发送 5 个字符
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize)
        this.sendStreamChunk(chunk)
        // 添加小延迟模拟流式效果
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // 5. 发送完成信号
      this.sendStreamComplete()

      // 6. 更新对话历史
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      )

      if (this.conversationHistory.length > this.MAX_HISTORY) {
        this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY)
      }

    } catch (error: any) {
      console.error('[ChatService] 流式对话失败:', error)
      this.sendStreamError(error.message)
    }
  }

  /**
   * 检索相关记忆
   */
  private async retrieveRelevantMemories(query: string): Promise<any[]> {
    try {
      const result = await this.memUService.retrieveConversation(query, 5)
      return result.memories || []
    } catch (error) {
      console.error('[ChatService] 检索记忆失败:', error)
      return []
    }
  }

  /**
   * 构建消息列表
   */
  private buildMessages(userMessage: string, memories: any[]): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 系统提示词
    let systemPrompt = this.getSystemPrompt()

    // 注入相关记忆
    if (memories.length > 0) {
      systemPrompt += '\n\n相关记忆:\n'
      memories.forEach((memory, index) => {
        systemPrompt += `${index + 1}. ${memory.content}\n`
      })
    }

    messages.push({ role: 'system', content: systemPrompt })

    // 对话历史
    messages.push(...this.conversationHistory.slice(-10))

    // 当前用户消息
    messages.push({ role: 'user', content: userMessage })

    return messages
  }

  /**
   * 调用 LLM API (通过 memU-server)
   */
  private async callLLM(messages: ChatMessage[]): Promise<string> {
    // 提取用户消息和历史
    const userMessage = messages[messages.length - 1].content
    const history = messages.slice(1, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const response = await fetch(`http://127.0.0.1:8000/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        history,
        personality: this.config.personality,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        retrieve_memories: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`memU-server 错误: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.response
  }

  /**
   * 调用流式 LLM API (通过 memU-server)
   */
  private async callLLMStream(messages: ChatMessage[], userMessage: string): Promise<void> {
    // 提取历史
    const history = messages.slice(1, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const response = await fetch(`http://127.0.0.1:8000/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        history,
        personality: this.config.personality,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        retrieve_memories: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`memU-server 错误: ${response.status} ${error}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          try {
            const parsed = JSON.parse(data)
            
            if (parsed.chunk) {
              fullResponse += parsed.chunk
              this.sendStreamChunk(parsed.chunk)
            } else if (parsed.done) {
              // 流式完成
              break
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            console.error('[ChatService] 解析流数据失败:', e)
          }
        }
      }
    }

    // 流式完成
    this.sendStreamComplete()

    // 更新对话历史
    this.conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: fullResponse }
    )

    if (this.conversationHistory.length > this.MAX_HISTORY) {
      this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY)
    }
  }

  /**
   * 发送流式数据块
   */
  private sendStreamChunk(content: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('chat-stream-chunk', content)
    }
  }

  /**
   * 发送流式完成信号
   */
  private sendStreamComplete() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('chat-stream-complete')
    }
  }

  /**
   * 发送流式错误
   */
  private sendStreamError(error: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('chat-stream-error', error)
    }
  }

  /**
   * 自动记忆对话
   */
  private async memorizeConversation(userMessage: string, aiResponse: string) {
    try {
      await this.memUService.memorizeConversation([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse },
      ])
      console.log('[ChatService] 对话已记忆')
    } catch (error) {
      console.error('[ChatService] 记忆对话失败:', error)
    }
  }

  /**
   * 清空对话历史
   */
  clearHistory() {
    this.conversationHistory = []
    console.log('[ChatService] 对话历史已清空')
  }

  /**
   * 获取对话历史
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }
}

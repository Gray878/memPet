import { spawn, ChildProcess } from 'child_process'
import axios, { AxiosError, AxiosInstance } from 'axios'
import path from 'path'

/**
 * memU-server 服务管理类
 */
export class MemUService {
  private process: ChildProcess | null = null
  private client: AxiosInstance
  private readonly baseURL: string
  private readonly serverPath: string
  private isReady: boolean = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private logs: string[] = []
  private readonly MAX_LOGS = 1000

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL
    this.serverPath = this.getServerPath()
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        const detail =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.response?.data?.error

        if (detail) {
          return Promise.reject(new Error(String(detail)))
        }

        if (error.code === 'ECONNABORTED') {
          return Promise.reject(new Error('请求超时，请稍后重试'))
        }

        if (error.code === 'ECONNREFUSED') {
          return Promise.reject(new Error('无法连接 memU-server，请确认后端已启动'))
        }

        return Promise.reject(new Error(error.message || '请求失败'))
      }
    )
  }

  private getServerPath(): string {
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), '..', 'memU-server')
    }
    return path.join(process.resourcesPath, 'memU-server')
  }

  async start(): Promise<void> {
    if (this.process) {
      console.log('[MemUService] 服务已在运行')
      return
    }

    console.log('[MemUService] 启动 memU-server...')
    
    // 设置环境变量禁用彩色输出和 Rich 库
    const env = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      NO_COLOR: '1',  // 禁用彩色输出
      TERM: 'dumb',   // 使用简单终端模式
    }
    
    this.process = spawn('uv', ['run', 'fastapi', 'dev', 'app/main.py', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: this.serverPath,
      shell: true,
      env: env,
    })

    this.process.stdout?.on('data', (data) => {
      const log = data.toString().trim()
      console.log(`[MemUService] ${log}`)
      this.addLog('INFO', log)
    })

    this.process.stderr?.on('data', (data) => {
      const log = data.toString().trim()
      console.error(`[MemUService] ${log}`)
      this.addLog('ERROR', log)
    })

    await this.waitForReady()
    this.startHealthCheck()
    console.log('[MemUService] 服务启动成功')
  }

  private async waitForReady(maxAttempts: number = 60): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.get('/')
        if (response.data.status === 'running') {
          this.isReady = true
          return
        }
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('memU-server 启动超时')
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client.get('/')
        this.isReady = true
      } catch (error) {
        this.isReady = false
      }
    }, 30000)
  }

  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    try {
      await this.flushBuffer()
    } catch (error) {
      console.error('[MemUService] 刷新缓冲区失败')
    }
    
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.isReady = false
  }

  isServiceReady(): boolean {
    return this.isReady
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed
  }

  async restart(): Promise<void> {
    console.log('[MemUService] 重启服务...')
    await this.stop()
    await new Promise(resolve => setTimeout(resolve, 2000))
    await this.start()
  }

  private addLog(level: string, message: string): void {
    const timestamp = new Date().toISOString()
    this.logs.push(`[${timestamp}] [${level}] ${message}`)
    
    // 保持日志数量在限制内
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS)
    }
  }

  getLogs(lines: number = 100): string[] {
    return this.logs.slice(-lines)
  }

  clearLogs(): void {
    this.logs = []
  }

  async memorizeConversation(content: any[]): Promise<any> {
    const response = await this.client.post('/memorize', {
      type: 'conversation',
      content,
    })
    return response.data
  }

  async memorizeObservation(observation: any): Promise<any> {
    const response = await this.client.post('/memorize', {
      type: 'system_observation',
      observation,
    })
    return response.data
  }

  async batchObservations(observations: any[]): Promise<any> {
    const response = await this.client.post('/batch/observations', {
      observations,
    })
    return response.data
  }

  async flushBuffer(): Promise<any> {
    if (!this.isReady) return
    const response = await this.client.post('/batch/flush')
    return response.data
  }

  async retrieveConversation(query: string, limit: number = 3): Promise<any> {
    const response = await this.client.post('/retrieve', {
      scenario: 'conversation',
      query,
      limit,
    })
    return response.data
  }

  async retrieveProactive(context: any, limit: number = 5): Promise<any> {
    const response = await this.client.post('/retrieve', {
      scenario: 'proactive',
      context,
      limit,
    })
    return response.data
  }

  async proactiveAnalyze(context: any): Promise<any> {
    const response = await this.client.post('/proactive/analyze', { context })
    return response.data
  }

  async proactiveGenerate(
    suggestion: any,
    context: any,
    personality: string = 'friendly',
    limit: number = 3
  ): Promise<any> {
    const response = await this.client.post('/proactive/generate', {
      suggestion,
      context,
      personality,
      limit,
    })
    return response.data
  }

  async getCooldownStatus(): Promise<any> {
    const response = await this.client.get('/proactive/cooldown')
    return response.data
  }

  async resetCooldown(type?: string): Promise<any> {
    const response = await this.client.post('/proactive/cooldown/reset', {
      type,
    })
    return response.data
  }
}

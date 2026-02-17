import { spawn, ChildProcess } from 'child_process'
import axios, { AxiosInstance } from 'axios'
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

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL
    this.serverPath = this.getServerPath()
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })
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
    
    this.process = spawn('uv', ['run', 'fastapi', 'dev', 'app/main.py'], {
      cwd: this.serverPath,
      shell: true,
      env: { ...process.env },
    })

    this.process.stdout?.on('data', (data) => {
      console.log(`[MemUService] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data) => {
      console.error(`[MemUService] ${data.toString().trim()}`)
    })

    await this.waitForReady()
    this.startHealthCheck()
    console.log('[MemUService] 服务启动成功')
  }

  private async waitForReady(maxAttempts: number = 30): Promise<void> {
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

import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

/**
 * 应用配置接口
 */
export interface AppConfig {
  // 通用设置
  general: {
    petName: string
    language: 'zh-CN' | 'en-US'
    autoStart: boolean
    alwaysOnTop: boolean
    opacity: number
  }
  
  // AI 模型设置
  ai: {
    provider: 'openai' | 'anthropic' | 'minimax' | 'custom'
    apiKey: string
    baseURL: string
    model: string
    temperature: number
    maxTokens: number
  }
  
  // 性格设置
  personality: {
    type: 'friendly' | 'energetic' | 'professional' | 'tsundere'
    emojiFrequency: number
    proactiveness: number
    formality: number
    customTraits: string[]
  }
  
  // 行为设置
  behavior: {
    proactiveEnabled: boolean
    proactiveInterval: number
    notificationsEnabled: boolean
    quietHoursEnabled: boolean
    quietHoursStart: string
    quietHoursEnd: string
  }
  
  // 后台服务设置
  backend: {
    memUServerPort: number
    memUServerHost: string
    autoRestart: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  
  // 数据设置
  data: {
    storagePath: string
    autoBackup: boolean
    backupInterval: number
    maxBackups: number
  }
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  general: {
    petName: '小U',
    language: 'zh-CN',
    autoStart: false,
    alwaysOnTop: true,
    opacity: 90,
  },
  ai: {
    provider: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
  },
  personality: {
    type: 'friendly',
    emojiFrequency: 50,
    proactiveness: 70,
    formality: 30,
    customTraits: [],
  },
  behavior: {
    proactiveEnabled: true,
    proactiveInterval: 300,
    notificationsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  backend: {
    memUServerPort: 8000,
    memUServerHost: '127.0.0.1',
    autoRestart: true,
    logLevel: 'info',
  },
  data: {
    storagePath: path.join(app.getPath('userData'), 'data'),
    autoBackup: true,
    backupInterval: 86400,
    maxBackups: 7,
  },
}

/**
 * 配置管理服务
 */
export class ConfigService {
  private config: AppConfig
  private configPath: string
  private listeners: Set<(config: AppConfig) => void> = new Set()

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json')
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * 加载配置
   */
  async load(): Promise<AppConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const savedConfig = JSON.parse(data)
      
      // 合并配置（保留默认值）
      this.config = this.mergeConfig(DEFAULT_CONFIG, savedConfig)
      
      console.log('[ConfigService] 配置已加载')
      return this.config
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 配置文件不存在，使用默认配置
        console.log('[ConfigService] 使用默认配置')
        await this.save()
        return this.config
      }
      
      console.error('[ConfigService] 加载配置失败:', error)
      throw error
    }
  }

  /**
   * 保存配置
   */
  async save(): Promise<void> {
    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(this.configPath), { recursive: true })
      
      // 保存配置
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      )
      
      console.log('[ConfigService] 配置已保存')
      
      // 通知监听器
      this.notifyListeners()
    } catch (error) {
      console.error('[ConfigService] 保存配置失败:', error)
      throw error
    }
  }

  /**
   * 获取配置
   */
  get(): AppConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  async update(updates: Partial<AppConfig>): Promise<void> {
    this.config = this.mergeConfig(this.config, updates)
    await this.save()
  }

  /**
   * 重置配置
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG }
    await this.save()
  }

  /**
   * 监听配置变化
   */
  onChange(listener: (config: AppConfig) => void): () => void {
    this.listeners.add(listener)
    
    // 返回取消监听的函数
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config)
      } catch (error) {
        console.error('[ConfigService] 监听器执行失败:', error)
      }
    })
  }

  /**
   * 深度合并配置
   */
  private mergeConfig(target: any, source: any): any {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfig(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  /**
   * 导出配置
   */
  async export(exportPath: string): Promise<void> {
    await fs.writeFile(
      exportPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    )
    console.log('[ConfigService] 配置已导出:', exportPath)
  }

  /**
   * 导入配置
   */
  async import(importPath: string): Promise<void> {
    const data = await fs.readFile(importPath, 'utf-8')
    const importedConfig = JSON.parse(data)
    
    this.config = this.mergeConfig(DEFAULT_CONFIG, importedConfig)
    await this.save()
    
    console.log('[ConfigService] 配置已导入:', importPath)
  }
}

import activeWin from 'active-win'
import { MemUService } from './MemUService'

interface AppActivity {
  app: string
  startTime: number
  lastUpdate: number
}

export interface SystemContext {
  working_duration: number
  active_app: string
  fatigue_level: string
  is_late_night: boolean
  idle_time: number
  is_work_hours: boolean
  focus_level: string
}

/**
 * 系统监控类
 */
export class SystemMonitor {
  private memUService: MemUService
  private monitorInterval: NodeJS.Timeout | null = null
  private currentActivity: AppActivity | null = null
  private observationBuffer: any[] = []
  private totalWorkTime: number = 0
  private idleStartTime: number | null = null
  private lastActiveTime: number = Date.now()
  
  private readonly MONITOR_INTERVAL = 30000
  private readonly MIN_ACTIVITY_DURATION = 300000
  private readonly IDLE_THRESHOLD = 300000
  private readonly BUFFER_SIZE = 10

  constructor(memUService: MemUService) {
    this.memUService = memUService
  }

  start(): void {
    if (this.monitorInterval) return
    
    console.log('[SystemMonitor] 启动系统监控...')
    this.checkActivity()
    
    this.monitorInterval = setInterval(() => {
      this.checkActivity()
    }, this.MONITOR_INTERVAL)
  }

  async stop(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    
    if (this.currentActivity) {
      await this.saveActivity(this.currentActivity)
    }
    
    await this.flushBuffer()
  }

  private async checkActivity(): Promise<void> {
    try {
      const window = await activeWin()
      
      if (!window) {
        this.handleIdle()
        return
      }
      
      this.lastActiveTime = Date.now()
      this.idleStartTime = null
      
      const appName = window.owner.name
      const now = Date.now()
      
      if (this.currentActivity && this.currentActivity.app !== appName) {
        await this.saveActivity(this.currentActivity)
        this.currentActivity = { app: appName, startTime: now, lastUpdate: now }
      } else if (!this.currentActivity) {
        this.currentActivity = { app: appName, startTime: now, lastUpdate: now }
      } else {
        this.currentActivity.lastUpdate = now
      }
      
      this.totalWorkTime += this.MONITOR_INTERVAL
    } catch (error) {
      // active-win 在某些环境下可能失败,使用降级方案
      console.warn('[SystemMonitor] 无法获取活动窗口,使用降级模式:', error)
      this.handleIdle()
    }
  }

  private handleIdle(): void {
    const now = Date.now()
    const timeSinceActive = now - this.lastActiveTime
    
    if (timeSinceActive >= this.IDLE_THRESHOLD && !this.idleStartTime) {
      this.idleStartTime = this.lastActiveTime
      const idleMinutes = Math.floor(timeSinceActive / 60000)
      this.addObservation({
        type: 'idle_detected',
        minutes: idleMinutes,
        timestamp: new Date(this.idleStartTime).toISOString(),
      })
    }
  }

  private async saveActivity(activity: AppActivity): Promise<void> {
    const duration = activity.lastUpdate - activity.startTime
    if (duration < this.MIN_ACTIVITY_DURATION) return
    
    const durationSeconds = Math.floor(duration / 1000)
    this.addObservation({
      type: 'app_switch',
      app: activity.app,
      duration: durationSeconds,
      timestamp: new Date(activity.startTime).toISOString(),
    })
    
    this.checkFatigue()
    this.checkLateNight()
  }

  private checkFatigue(): void {
    const workHours = this.totalWorkTime / 3600000
    if (workHours >= 2) {
      this.addObservation({
        type: 'fatigue_detected',
        hours: Math.floor(workHours),
        level: this.getFatigueLevel(workHours),
        timestamp: new Date().toISOString(),
      })
    }
  }

  private checkLateNight(): void {
    const hour = new Date().getHours()
    if (hour >= 22 || hour < 6) {
      this.addObservation({
        type: 'late_night_work',
        hour,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private addObservation(observation: any): void {
    this.observationBuffer.push(observation)
    if (this.observationBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer()
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.observationBuffer.length === 0) return
    
    try {
      await this.memUService.batchObservations(this.observationBuffer)
      console.log(`[SystemMonitor] 已刷新 ${this.observationBuffer.length} 条观察记录`)
      this.observationBuffer = []
    } catch (error) {
      console.error('[SystemMonitor] 刷新缓冲区失败:', error)
    }
  }

  getSystemContext(): SystemContext {
    const now = new Date()
    const hour = now.getHours()
    
    return {
      working_duration: Math.floor(this.totalWorkTime / 1000),
      active_app: this.currentActivity?.app || 'Unknown',
      fatigue_level: this.getFatigueLevel(this.totalWorkTime / 3600000),
      is_late_night: hour >= 22 || hour < 6,
      idle_time: this.idleStartTime ? Math.floor((Date.now() - this.idleStartTime) / 1000) : 0,
      is_work_hours: hour >= 9 && hour < 18,
      focus_level: this.getFocusLevel(),
    }
  }

  private getFatigueLevel(hours: number): string {
    if (hours < 1) return 'Fresh'
    if (hours < 2) return 'Normal'
    if (hours < 4) return 'Tired'
    return 'Exhausted'
  }

  private getFocusLevel(): string {
    if (!this.currentActivity) return 'Idle'
    const duration = Date.now() - this.currentActivity.startTime
    if (duration > 1800000) return 'DeepFocus'
    if (duration > 600000) return 'NormalFocus'
    return 'Distracted'
  }

  resetWorkTime(): void {
    this.totalWorkTime = 0
  }

  getWorkTime(): number {
    return Math.floor(this.totalWorkTime / 1000)
  }

  getCurrentApp(): string {
    return this.currentActivity?.app || 'Unknown'
  }
}

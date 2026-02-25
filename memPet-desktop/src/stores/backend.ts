import type { BackendStatus } from '@/services/backendRuntime'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import {

  getBackendLogs,
  getBackendStatus,
  recoverBackendWithBackoff,
  restartBackend,
  startBackend,
  stopBackend,
  waitForBackendHealthy,
} from '@/services/backendRuntime'
import { memPetApi } from '@/services/memPetApi'

const defaultStatus: BackendStatus = {
  running: false,
  pid: null,
  mode: 'stopped',
  url: 'http://127.0.0.1:8000',
}

export const useBackendStore = defineStore('backend', () => {
  const status = ref<BackendStatus>({ ...defaultStatus })
  const rootInfo = ref<Record<string, unknown> | null>(null)
  const health = ref<Record<string, unknown> | null>(null)
  const logs = ref<string[]>([])
  const loading = ref(false)
  const lastError = ref('')
  const watchdogEnabled = ref(false)
  const recovering = ref(false)

  let watchdogTimer: ReturnType<typeof setInterval> | null = null
  let watchdogTicking = false

  async function refreshStatus() {
    status.value = await getBackendStatus()
    return status.value
  }

  async function refreshHealth() {
    const response = await memPetApi.health()
    health.value = response.data as Record<string, unknown>
    return health.value
  }

  async function refreshRoot() {
    const response = await memPetApi.root()
    rootInfo.value = response.data as Record<string, unknown>
    return rootInfo.value
  }

  async function refreshLogs(lines = 200) {
    logs.value = await getBackendLogs(lines)
    return logs.value
  }

  async function ensureReady() {
    loading.value = true
    lastError.value = ''
    try {
      const readyStatus = await recoverBackendWithBackoff()
      status.value = readyStatus
      await waitForBackendHealthy({ maxAttempts: 5 })
      await refreshRoot()
      await refreshHealth()
      await refreshLogs(120)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '后端不可用'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function start() {
    loading.value = true
    lastError.value = ''
    try {
      status.value = await startBackend()
      await waitForBackendHealthy({ maxAttempts: 6 })
      await refreshRoot()
      await refreshHealth()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '启动后端失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function stop() {
    loading.value = true
    lastError.value = ''
    try {
      status.value = await stopBackend()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '停止后端失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function restart() {
    loading.value = true
    lastError.value = ''
    try {
      status.value = await restartBackend()
      await waitForBackendHealthy({ maxAttempts: 6 })
      await refreshRoot()
      await refreshHealth()
      await refreshLogs(120)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '重启后端失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function watchdogTick() {
    if (watchdogTicking) {
      return
    }
    watchdogTicking = true
    try {
      const current = await refreshStatus()
      if (!current.running && !recovering.value) {
        recovering.value = true
        await ensureReady()
      } else {
        await refreshRoot().catch(() => undefined)
        await refreshHealth().catch(() => undefined)
      }
      await refreshLogs(80).catch(() => undefined)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '后端监控失败'
    } finally {
      recovering.value = false
      watchdogTicking = false
    }
  }

  function startWatchdog(intervalMs = 10000) {
    if (watchdogTimer) {
      return
    }
    watchdogEnabled.value = true
    watchdogTimer = setInterval(() => {
      void watchdogTick()
    }, intervalMs)
    void watchdogTick()
  }

  function stopWatchdog() {
    watchdogEnabled.value = false
    if (!watchdogTimer) {
      return
    }
    clearInterval(watchdogTimer)
    watchdogTimer = null
  }

  return {
    status,
    rootInfo,
    health,
    logs,
    loading,
    lastError,
    watchdogEnabled,
    recovering,
    refreshStatus,
    refreshRoot,
    refreshHealth,
    refreshLogs,
    ensureReady,
    start,
    stop,
    restart,
    startWatchdog,
    stopWatchdog,
  }
})

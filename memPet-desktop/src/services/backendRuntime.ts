import { invoke } from '@tauri-apps/api/core'

import { memPetApi } from '@/services/memPetApi'

export interface BackendStatus {
  running: boolean
  pid: number | null
  mode: string
  url: string
}

export async function startBackend(): Promise<BackendStatus> {
  return invoke<BackendStatus>('start_backend')
}

export async function stopBackend(): Promise<BackendStatus> {
  return invoke<BackendStatus>('stop_backend')
}

export async function getBackendStatus(): Promise<BackendStatus> {
  return invoke<BackendStatus>('backend_status')
}

export async function getBackendLogs(lines = 200): Promise<string[]> {
  return invoke<string[]>('backend_logs', { lines })
}

export async function restartBackend(): Promise<BackendStatus> {
  await stopBackend()
  return startBackend()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function ensureBackendRunning(): Promise<BackendStatus> {
  const status = await getBackendStatus()
  if (status.running) {
    return status
  }
  return startBackend()
}

export async function waitForBackendHealthy(options: {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
} = {}): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 10
  const maxDelayMs = options.maxDelayMs ?? 8000
  let delayMs = options.initialDelayMs ?? 500

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await ensureBackendRunning()
    if (!status.running) {
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, maxDelayMs)
      continue
    }

    try {
      await memPetApi.health()
      return
    } catch {
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, maxDelayMs)
    }
  }

  throw new Error('后端健康检查超时')
}

export async function recoverBackendWithBackoff(options: {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
} = {}): Promise<BackendStatus> {
  const maxRetries = options.maxRetries ?? 5
  const maxDelayMs = options.maxDelayMs ?? 12000
  let delayMs = options.initialDelayMs ?? 1000

  let lastError: unknown = null

  for (let retry = 0; retry < maxRetries; retry += 1) {
    try {
      const status = await ensureBackendRunning()
      await waitForBackendHealthy({ maxAttempts: 3, initialDelayMs: 400, maxDelayMs })
      return status
    } catch (error) {
      lastError = error
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, maxDelayMs)
      await stopBackend().catch(() => undefined)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('后端恢复失败')
}

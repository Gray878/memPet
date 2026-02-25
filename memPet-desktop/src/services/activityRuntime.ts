import { invoke } from '@tauri-apps/api/core'

import { INVOKE_KEY } from '@/constants'

export interface ActiveAppSnapshot {
  available: boolean
  appName: string
  windowTitle: string
  processPath: string
  processId: number | null
  capturedAtMs: number
  error: string | null
}

export async function getActiveAppSnapshot(): Promise<ActiveAppSnapshot> {
  return invoke<ActiveAppSnapshot>(INVOKE_KEY.ACTIVE_APP_SNAPSHOT)
}

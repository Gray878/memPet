import type { SystemContext } from '@/types/memPetDomain'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getActiveAppSnapshot } from '@/services/activityRuntime'
import { memPetApi } from '@/services/memPetApi'

const SAMPLE_INTERVAL_MS = 30_000
const FLUSH_INTERVAL_MS = 60_000
const MAX_BATCH_SIZE = 10
const IDLE_THRESHOLD_SECONDS = 300

function nowMs(): number {
  return Date.now()
}

function fatigueLevel(hours: number): string {
  if (hours < 1) {
    return 'Fresh'
  }
  if (hours < 2) {
    return 'Normal'
  }
  if (hours < 4) {
    return 'Tired'
  }
  return 'Exhausted'
}

function inLateNight(current: Date): boolean {
  const hour = current.getHours()
  return hour >= 22 || hour < 6
}

function inWorkHours(current: Date): boolean {
  const hour = current.getHours()
  return hour >= 9 && hour < 18
}

export const useObservationQueueStore = defineStore('observationQueue', () => {
  const started = ref(false)
  const flushing = ref(false)
  const lastError = ref('')
  const queue = ref<Array<Record<string, unknown>>>([])
  const startedAtMs = ref(nowMs())
  const lastActivityAtMs = ref(nowMs())
  const activeApp = ref('Unknown')
  const activeAppSinceMs = ref(nowMs())
  const lastFlushAtMs = ref(nowMs())
  const lastIdleEventAtMs = ref(0)
  const lastLateNightEventAtMs = ref(0)
  const context = ref<SystemContext>({
    working_duration: 0,
    active_app: 'Unknown',
    fatigue_level: 'Fresh',
    is_late_night: false,
    idle_time: 0,
    is_work_hours: false,
    focus_level: 'Idle',
  })

  let sampleTimer: ReturnType<typeof setInterval> | null = null
  let flushTimer: ReturnType<typeof setInterval> | null = null

  const queueSize = computed(() => queue.value.length)

  function markUserActivity() {
    lastActivityAtMs.value = nowMs()
  }

  function enqueueObservation(observation: Record<string, unknown>) {
    queue.value.push({
      ...observation,
      timestamp: observation.timestamp || new Date().toISOString(),
    })

    if (queue.value.length > 500) {
      queue.value = queue.value.slice(-500)
    }
  }

  function buildContextSnapshot(): SystemContext {
    const now = nowMs()
    const nowDate = new Date(now)
    const idleSeconds = Math.max(0, Math.floor((now - lastActivityAtMs.value) / 1000))
    const workingSeconds = Math.max(0, Math.floor((now - startedAtMs.value) / 1000))
    const appFocusedSeconds = Math.max(0, Math.floor((now - activeAppSinceMs.value) / 1000))

    let focusLevel = 'Distracted'
    if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
      focusLevel = 'Idle'
    } else if (appFocusedSeconds >= 1800) {
      focusLevel = 'DeepFocus'
    } else if (appFocusedSeconds >= 600) {
      focusLevel = 'NormalFocus'
    }

    const nextContext: SystemContext = {
      working_duration: workingSeconds,
      active_app: activeApp.value,
      fatigue_level: fatigueLevel(workingSeconds / 3600),
      is_late_night: inLateNight(nowDate),
      idle_time: idleSeconds,
      is_work_hours: inWorkHours(nowDate),
      focus_level: focusLevel,
    }
    context.value = nextContext
    return nextContext
  }

  async function flushNow() {
    if (flushing.value || queue.value.length === 0) {
      return
    }

    flushing.value = true
    lastError.value = ''
    const snapshot = [...queue.value]
    queue.value = []

    try {
      while (snapshot.length > 0) {
        const observations = snapshot.splice(0, MAX_BATCH_SIZE)
        await memPetApi.batchObservations({ observations })
      }
      await memPetApi.flushObservations()
      lastFlushAtMs.value = nowMs()
    } catch (error) {
      // 请求失败时回滚队列，保证后续重试不丢数据
      queue.value = [...snapshot, ...queue.value]
      lastError.value = error instanceof Error ? error.message : '批量写入观察记录失败'
    } finally {
      flushing.value = false
    }
  }

  async function collectSnapshot() {
    try {
      const snapshot = await getActiveAppSnapshot()
      const currentMs = nowMs()
      if (snapshot.available && snapshot.appName) {
        if (activeApp.value !== snapshot.appName) {
          const durationSeconds = Math.max(1, Math.floor((currentMs - activeAppSinceMs.value) / 1000))
          if (activeApp.value !== 'Unknown') {
            enqueueObservation({
              type: 'app_switch',
              app: activeApp.value,
              duration: durationSeconds,
            })
          }
          activeApp.value = snapshot.appName
          activeAppSinceMs.value = currentMs
        }
      }

      const nextContext = buildContextSnapshot()

      if (nextContext.idle_time >= IDLE_THRESHOLD_SECONDS && currentMs - lastIdleEventAtMs.value > IDLE_THRESHOLD_SECONDS * 1000) {
        enqueueObservation({
          type: 'idle_detected',
          minutes: Math.floor(nextContext.idle_time / 60),
        })
        lastIdleEventAtMs.value = currentMs
      }

      if (nextContext.is_late_night && nextContext.working_duration >= 3600) {
        if (currentMs - lastLateNightEventAtMs.value < 30 * 60 * 1000) {
          return
        }
        enqueueObservation({
          type: 'late_night_work',
          hour: new Date().getHours(),
        })
        lastLateNightEventAtMs.value = currentMs
      }

      if (queue.value.length >= MAX_BATCH_SIZE) {
        await flushNow()
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '采集系统上下文失败'
    }
  }

  async function start() {
    if (started.value) {
      return
    }
    started.value = true
    startedAtMs.value = nowMs()
    lastActivityAtMs.value = nowMs()
    activeAppSinceMs.value = nowMs()
    lastFlushAtMs.value = nowMs()
    lastIdleEventAtMs.value = 0
    lastLateNightEventAtMs.value = 0
    await collectSnapshot()

    sampleTimer = setInterval(() => {
      void collectSnapshot()
    }, SAMPLE_INTERVAL_MS)

    flushTimer = setInterval(() => {
      if (nowMs() - lastFlushAtMs.value >= FLUSH_INTERVAL_MS) {
        void flushNow()
      }
    }, 10_000)
  }

  async function stop() {
    started.value = false
    if (sampleTimer) {
      clearInterval(sampleTimer)
      sampleTimer = null
    }
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    await flushNow()
  }

  function getContextSnapshot(): SystemContext {
    return buildContextSnapshot()
  }

  return {
    started,
    flushing,
    lastError,
    queue,
    queueSize,
    context,
    markUserActivity,
    enqueueObservation,
    buildContextSnapshot,
    collectSnapshot,
    flushNow,
    start,
    stop,
    getContextSnapshot,
  }
})

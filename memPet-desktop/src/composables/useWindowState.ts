import type { Event } from '@tauri-apps/api/event'

import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { availableMonitors, currentMonitor } from '@tauri-apps/api/window'
import { isNumber } from 'es-toolkit/compat'
import { onMounted, ref } from 'vue'

import { useAppStore } from '@/stores/app'

export type WindowState = Record<string, Partial<PhysicalPosition & PhysicalSize> | undefined>

const appWindow = getCurrentWebviewWindow()
const { label } = appWindow

export function useWindowState() {
  const appStore = useAppStore()
  const isRestored = ref(false)

  onMounted(() => {
    appWindow.onMoved(onChange)

    appWindow.onResized(onChange)
  })

  const onChange = async (event: Event<PhysicalPosition | PhysicalSize>) => {
    const minimized = await appWindow.isMinimized()

    if (minimized) return

    appStore.windowState[label] ??= {}

    Object.assign(appStore.windowState[label], event.payload)
  }

  const restoreState = async () => {
    const { x, y, width, height } = appStore.windowState[label] ?? {}
    const monitors = await availableMonitors()

    if (isNumber(x) && isNumber(y)) {
      const monitor = monitors.find((monitor) => {
        const { position, size } = monitor

        const inBoundsX = x >= position.x && x <= position.x + size.width
        const inBoundsY = y >= position.y && y <= position.y + size.height

        return inBoundsX && inBoundsY
      })

      if (monitor) {
        await appWindow.setPosition(new PhysicalPosition(x, y))
      } else if (monitors.length > 0) {
        await appWindow.setPosition(new PhysicalPosition(monitors[0].position.x, monitors[0].position.y))
      }
    } else if (monitors.length > 0) {
      const monitor = await currentMonitor() ?? monitors[0]
      await appWindow.setPosition(new PhysicalPosition(monitor.position.x, monitor.position.y))
    }

    if (width && height) {
      await appWindow.setSize(new PhysicalSize(width, height))
    }

    isRestored.value = true
  }

  return {
    isRestored,
    restoreState,
  }
}

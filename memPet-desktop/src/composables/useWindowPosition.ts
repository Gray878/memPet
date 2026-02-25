import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted, ref, watch } from 'vue'

import { useCatStore } from '@/stores/cat'
import { getCursorMonitor } from '@/utils/monitor'

const appWindow = getCurrentWebviewWindow()

export function useWindowPosition() {
  const catStore = useCatStore()
  const isMounted = ref(false)

  const setWindowPosition = async () => {
    const monitor = await getCursorMonitor()

    if (!monitor) return

    const windowSize = await appWindow.outerSize()
    const left = monitor.position.x
    const top = monitor.position.y
    const right = left + Math.max(monitor.size.width - windowSize.width, 0)
    const bottom = top + Math.max(monitor.size.height - windowSize.height, 0)

    switch (catStore.window.position) {
      case 'topLeft':
        return appWindow.setPosition(new PhysicalPosition(left, top))
      case 'topRight':
        return appWindow.setPosition(new PhysicalPosition(right, top))
      case 'bottomLeft':
        return appWindow.setPosition(new PhysicalPosition(left, bottom))
      default:
        return appWindow.setPosition(new PhysicalPosition(right, bottom))
    }
  }

  onMounted(async () => {
    await setWindowPosition()

    isMounted.value = true

    appWindow.onScaleChanged(setWindowPosition)
  })

  watch(() => catStore.window.position, setWindowPosition)

  return {
    isMounted,
    setWindowPosition,
  }
}

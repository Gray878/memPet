import type { PhysicalPosition } from '@tauri-apps/api/window'

import { availableMonitors, currentMonitor, cursorPosition } from '@tauri-apps/api/window'

export async function getCursorMonitor(cursorPoint?: PhysicalPosition) {
  cursorPoint ??= await cursorPosition()

  const monitors = await availableMonitors()
  const monitor = monitors.find(({ position, size }) => {
    const inBoundsX = cursorPoint.x >= position.x && cursorPoint.x < position.x + size.width
    const inBoundsY = cursorPoint.y >= position.y && cursorPoint.y < position.y + size.height

    return inBoundsX && inBoundsY
  })

  if (monitor) return monitor

  return await currentMonitor() ?? monitors[0]
}

import type { CompassPermission } from '../types'
import { normalizeHeading } from './geo'

interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number
}

interface PermissionAwareDeviceOrientationConstructor {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export async function requestCompassPermission(): Promise<CompassPermission> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return 'unsupported'
  }

  const constructor = window.DeviceOrientationEvent as unknown as PermissionAwareDeviceOrientationConstructor
  if (typeof constructor.requestPermission !== 'function') return 'granted'

  try {
    return (await constructor.requestPermission()) === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export function headingFromOrientation(
  event: DeviceOrientationEvent,
  screenAngle = 0,
): number | null {
  const iosHeading = (event as IOSDeviceOrientationEvent).webkitCompassHeading
  if (typeof iosHeading === 'number' && Number.isFinite(iosHeading)) {
    return normalizeHeading(iosHeading)
  }

  if (typeof event.alpha !== 'number' || !Number.isFinite(event.alpha)) return null
  if (!event.absolute && event.type !== 'deviceorientationabsolute') return null

  return normalizeHeading(360 - event.alpha + screenAngle)
}

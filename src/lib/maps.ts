import type { Coordinates } from '../types'

export const GOOGLE_MAPS_FALLBACK_DELAY = 1_500

interface MapsLaunchEnvironment {
  visibilityState: () => DocumentVisibilityState
  addVisibilityListener: (listener: () => void) => void
  removeVisibilityListener: (listener: () => void) => void
  navigate: (url: string) => void
  setTimer: (callback: () => void, delay: number) => number
  clearTimer: (timer: number) => void
}

function coordinateQuery(coordinates: Coordinates): string {
  return encodeURIComponent(`${coordinates.lat},${coordinates.lon}`)
}

export function googleMapsWebUrl(coordinates: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coordinateQuery(coordinates)}`
}

export function googleMapsIosUrl(coordinates: Coordinates): string {
  return `comgooglemapsurl://www.google.com/maps/search/?api=1&query=${coordinateQuery(coordinates)}`
}

export function isIosDevice(device: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator): boolean {
  return /iPad|iPhone|iPod/.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
}

function browserEnvironment(): MapsLaunchEnvironment {
  return {
    visibilityState: () => document.visibilityState,
    addVisibilityListener: (listener) => document.addEventListener('visibilitychange', listener),
    removeVisibilityListener: (listener) => document.removeEventListener('visibilitychange', listener),
    navigate: (url) => window.location.assign(url),
    setTimer: (callback, delay) => window.setTimeout(callback, delay),
    clearTimer: (timer) => window.clearTimeout(timer),
  }
}

export function launchGoogleMapsApp(
  iosUrl: string,
  fallbackUrl: string,
  environment: MapsLaunchEnvironment = browserEnvironment(),
): void {
  let timer: number | null = null

  const cleanup = () => {
    if (timer !== null) environment.clearTimer(timer)
    environment.removeVisibilityListener(handleVisibilityChange)
  }

  const handleVisibilityChange = () => {
    if (environment.visibilityState() === 'hidden') cleanup()
  }

  environment.addVisibilityListener(handleVisibilityChange)
  timer = environment.setTimer(() => {
    cleanup()
    if (environment.visibilityState() === 'visible') environment.navigate(fallbackUrl)
  }, GOOGLE_MAPS_FALLBACK_DELAY)

  try {
    environment.navigate(iosUrl)
  } catch {
    cleanup()
    environment.navigate(fallbackUrl)
  }
}

import {
  GOOGLE_MAPS_FALLBACK_DELAY,
  googleMapsIosUrl,
  googleMapsWebUrl,
  isIosDevice,
  launchGoogleMapsApp,
} from './maps'

const coordinates = { lat: 48.1368, lon: 11.5762 }

function createLaunchEnvironment() {
  let visibilityState: DocumentVisibilityState = 'visible'
  let visibilityListener: (() => void) | null = null
  const navigate = vi.fn()

  return {
    environment: {
      visibilityState: () => visibilityState,
      addVisibilityListener: vi.fn((listener: () => void) => {
        visibilityListener = listener
      }),
      removeVisibilityListener: vi.fn(),
      navigate,
      setTimer: (callback: () => void, delay: number) => window.setTimeout(callback, delay),
      clearTimer: (timer: number) => window.clearTimeout(timer),
    },
    navigate,
    hidePage: () => {
      visibilityState = 'hidden'
      visibilityListener?.()
    },
  }
}

describe('Google Maps links', () => {
  afterEach(() => vi.useRealTimers())

  it('builds web and iOS URLs for station coordinates', () => {
    expect(googleMapsWebUrl(coordinates)).toBe(
      'https://www.google.com/maps/search/?api=1&query=48.1368%2C11.5762',
    )
    expect(googleMapsIosUrl(coordinates)).toBe(
      'comgooglemapsurl://www.google.com/maps/search/?api=1&query=48.1368%2C11.5762',
    )
  })

  it.each([
    ['iPhone', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 }, true],
    ['iPadOS', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 }, true],
    ['Mac', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 0 }, false],
    ['Android', { userAgent: 'Mozilla/5.0 (Linux; Android 15)', platform: 'Linux armv8l', maxTouchPoints: 5 }, false],
  ])('detects %s devices', (_name, device, expected) => {
    expect(isIosDevice(device)).toBe(expected)
  })

  it('falls back to the web URL when the app does not open', () => {
    vi.useFakeTimers()
    const { environment, navigate } = createLaunchEnvironment()

    launchGoogleMapsApp('comgooglemapsurl://station', 'https://maps.example/station', environment)
    expect(navigate).toHaveBeenCalledWith('comgooglemapsurl://station')

    vi.advanceTimersByTime(GOOGLE_MAPS_FALLBACK_DELAY)
    expect(navigate).toHaveBeenLastCalledWith('https://maps.example/station')
  })

  it('cancels the fallback when opening the app hides the page', () => {
    vi.useFakeTimers()
    const { environment, navigate, hidePage } = createLaunchEnvironment()

    launchGoogleMapsApp('comgooglemapsurl://station', 'https://maps.example/station', environment)
    hidePage()
    vi.advanceTimersByTime(GOOGLE_MAPS_FALLBACK_DELAY)

    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('falls back immediately when the app URL cannot be opened', () => {
    const { environment, navigate } = createLaunchEnvironment()
    navigate.mockImplementationOnce(() => {
      throw new Error('Unsupported URL scheme')
    })

    launchGoogleMapsApp('comgooglemapsurl://station', 'https://maps.example/station', environment)

    expect(navigate).toHaveBeenLastCalledWith('https://maps.example/station')
  })
})

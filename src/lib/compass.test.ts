import { headingFromOrientation } from './compass'

describe('compass heading', () => {
  it('uses the iOS compass heading when present', () => {
    const event = { webkitCompassHeading: 275, alpha: 12, absolute: false, type: 'deviceorientation' }
    expect(headingFromOrientation(event as unknown as DeviceOrientationEvent)).toBe(275)
  })

  it('converts an absolute alpha and accounts for screen orientation', () => {
    const event = { alpha: 90, absolute: true, type: 'deviceorientationabsolute' }
    expect(headingFromOrientation(event as unknown as DeviceOrientationEvent, 90)).toBe(0)
  })

  it('rejects relative orientation without an iOS heading', () => {
    const event = { alpha: 90, absolute: false, type: 'deviceorientation' }
    expect(headingFromOrientation(event as unknown as DeviceOrientationEvent)).toBeNull()
  })
})

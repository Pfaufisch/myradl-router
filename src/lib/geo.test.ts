import {
  bearingDegrees,
  formatDistance,
  formatElapsed,
  haversineMeters,
  isBillingWarning,
  normalizeHeading,
  relativeArrowRotation,
  smoothHeading,
  walkingMinutes,
} from './geo'

describe('geo helpers', () => {
  it('calculates distance, bearing, and walking estimates', () => {
    const origin = { lat: 48, lon: 11 }
    expect(haversineMeters(origin, { lat: 48.001, lon: 11 })).toBeCloseTo(111.19, 0)
    expect(bearingDegrees(origin, { lat: 49, lon: 11 })).toBeCloseTo(0, 5)
    expect(bearingDegrees(origin, { lat: 48, lon: 12 })).toBeCloseTo(89.63, 1)
    expect(walkingMinutes(161)).toBe(3)
    expect(walkingMinutes(0)).toBe(1)
  })

  it('normalizes and smooths headings across north', () => {
    expect(normalizeHeading(-10)).toBe(350)
    expect(relativeArrowRotation(20, 350)).toBe(30)
    expect(smoothHeading(350, 10, 0.5)).toBe(0)
  })

  it('formats navigation distances and elapsed time', () => {
    expect(formatDistance(421.6)).toEqual({ primary: '422 m' })
    expect(formatDistance(1_240)).toEqual({ primary: '1,2 km', secondary: '1.240 m' })
    expect(formatElapsed(3_723_400)).toBe('01:02:03')
  })

  it('warns during the final five minutes of every billing interval', () => {
    expect(isBillingWarning(24 * 60_000 + 59_000)).toBe(false)
    expect(isBillingWarning(25 * 60_000)).toBe(true)
    expect(isBillingWarning(31 * 60_000)).toBe(false)
    expect(isBillingWarning(55 * 60_000)).toBe(true)
  })
})

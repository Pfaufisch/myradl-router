import type { Coordinates } from '../types'

const EARTH_RADIUS_METERS = 6_371_000
const WALKING_METERS_PER_MINUTE = 80

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

export function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function haversineMeters(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function bearingDegrees(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLon = toRadians(to.lon - from.lon)
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

  return normalizeHeading(toDegrees(Math.atan2(y, x)))
}

export function relativeArrowRotation(bearing: number, heading: number): number {
  return normalizeHeading(bearing - heading)
}

export function smoothHeading(previous: number | null, next: number, factor = 0.22): number {
  if (previous === null) return normalizeHeading(next)
  const shortestDelta = ((next - previous + 540) % 360) - 180
  return normalizeHeading(previous + shortestDelta * factor)
}

export function walkingMinutes(distanceMeters: number): number {
  return Math.max(1, Math.ceil(distanceMeters / WALKING_METERS_PER_MINUTE))
}

export function formatDistance(distanceMeters: number): { primary: string; secondary?: string } {
  const meters = Math.max(0, Math.round(distanceMeters))
  const meterLabel = `${new Intl.NumberFormat('de-DE').format(meters)} m`

  if (meters < 1_000) return { primary: meterLabel }

  return {
    primary: `${new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(meters / 1_000)} km`,
    secondary: meterLabel,
  }
}

export function formatElapsed(elapsedMilliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function isBillingWarning(elapsedMilliseconds: number): boolean {
  const interval = 30 * 60 * 1_000
  const warningStart = 25 * 60 * 1_000
  return elapsedMilliseconds % interval >= warningStart
}

import type { Destination, Station, TripState } from '../types'

export const TRIP_STORAGE_KEY = 'myradl-router.trip.v1'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function isDestination(value: unknown): value is Destination {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.label === 'string' &&
    isFiniteNumber(item.lat) &&
    isFiniteNumber(item.lon)
  )
}

function isStation(value: unknown): value is Station {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.shortName === 'string' &&
    typeof item.name === 'string' &&
    typeof item.regionId === 'string' &&
    typeof item.acceptsReturns === 'boolean' &&
    isFiniteNumber(item.lastReported) &&
    isFiniteNumber(item.lat) &&
    isFiniteNumber(item.lon)
  )
}

export function parseTrip(value: string | null): TripState | null {
  if (!value) return null

  try {
    const item = JSON.parse(value) as Record<string, unknown>
    if (
      item.version !== 1 ||
      !isFiniteNumber(item.startedAt) ||
      item.startedAt <= 0 ||
      (item.destination !== null && !isDestination(item.destination)) ||
      (item.selectedStation !== null && !isStation(item.selectedStation))
    ) {
      return null
    }

    return item as unknown as TripState
  } catch {
    return null
  }
}

export function loadTrip(storage: Pick<Storage, 'getItem'> = localStorage): TripState | null {
  return parseTrip(storage.getItem(TRIP_STORAGE_KEY))
}

export function saveTrip(trip: TripState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip))
}

export function clearTrip(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(TRIP_STORAGE_KEY)
}

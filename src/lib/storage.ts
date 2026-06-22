import type { Destination, SavedDestinationsState, Station, TripState } from '../types'

export const TRIP_STORAGE_KEY = 'myradl-router.trip.v1'
export const DESTINATIONS_STORAGE_KEY = 'myradl-router.destinations.v1'
export const MAX_RECENT_DESTINATIONS = 5

const emptySavedDestinations = (): SavedDestinationsState => ({
  version: 1,
  recents: [],
  favorites: [],
})

const normalizedQuery = (query: string): string => query.trim().toLocaleLowerCase('de')

function uniqueQueries(queries: string[]): string[] {
  const seen = new Set<string>()
  return queries.filter((query) => {
    const normalized = normalizedQuery(query)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

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

export function parseSavedDestinations(value: string | null): SavedDestinationsState {
  if (!value) return emptySavedDestinations()

  try {
    const item = JSON.parse(value) as Record<string, unknown>
    if (
      item.version !== 1 ||
      !Array.isArray(item.recents) ||
      !Array.isArray(item.favorites) ||
      !item.recents.every((query) => typeof query === 'string' && query.trim().length > 0) ||
      !item.favorites.every((query) => typeof query === 'string' && query.trim().length > 0)
    ) {
      return emptySavedDestinations()
    }

    return {
      version: 1,
      recents: uniqueQueries(item.recents.map((query) => query.trim())).slice(0, MAX_RECENT_DESTINATIONS),
      favorites: uniqueQueries(item.favorites.map((query) => query.trim())),
    }
  } catch {
    return emptySavedDestinations()
  }
}

export function loadSavedDestinations(
  storage: Pick<Storage, 'getItem'> = localStorage,
): SavedDestinationsState {
  return parseSavedDestinations(storage.getItem(DESTINATIONS_STORAGE_KEY))
}

export function saveSavedDestinations(
  destinations: SavedDestinationsState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(DESTINATIONS_STORAGE_KEY, JSON.stringify(destinations))
}

export function addRecentDestination(
  destinations: SavedDestinationsState,
  query: string,
): SavedDestinationsState {
  const trimmed = query.trim()
  if (!trimmed) return destinations
  const normalized = normalizedQuery(trimmed)

  return {
    ...destinations,
    recents: [
      trimmed,
      ...destinations.recents.filter((recent) => normalizedQuery(recent) !== normalized),
    ].slice(0, MAX_RECENT_DESTINATIONS),
  }
}

export function toggleFavoriteDestination(
  destinations: SavedDestinationsState,
  query: string,
): SavedDestinationsState {
  const trimmed = query.trim()
  if (!trimmed) return destinations
  const normalized = normalizedQuery(trimmed)
  const isFavorite = destinations.favorites.some(
    (favorite) => normalizedQuery(favorite) === normalized,
  )

  return {
    ...destinations,
    favorites: isFavorite
      ? destinations.favorites.filter((favorite) => normalizedQuery(favorite) !== normalized)
      : [trimmed, ...destinations.favorites],
  }
}

export function isFavoriteDestination(destinations: SavedDestinationsState, query: string): boolean {
  const normalized = normalizedQuery(query)
  return destinations.favorites.some((favorite) => normalizedQuery(favorite) === normalized)
}

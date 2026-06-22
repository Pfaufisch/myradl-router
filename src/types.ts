export type AppView = 'start' | 'destination' | 'stations' | 'navigation'

export interface Coordinates {
  lat: number
  lon: number
}

export interface Destination extends Coordinates {
  id: string
  name: string
  label: string
}

export interface Station extends Coordinates {
  id: string
  shortName: string
  name: string
  regionId: string
  acceptsReturns: boolean
  lastReported: number
}

export interface RankedStation {
  station: Station
  distanceToDestination: number
  walkingMinutes: number
}

export interface TripState {
  version: 1
  startedAt: number
  destination: Destination | null
  selectedStation: Station | null
}

export interface SavedDestinationsState {
  version: 1
  recents: string[]
  favorites: string[]
}

export type CompassPermission = 'prompt' | 'granted' | 'denied' | 'unsupported'
export type HeadingSource = 'compass' | 'gps' | 'north-up' | 'waiting'

import {
  addRecentDestination,
  clearTrip,
  DESTINATIONS_STORAGE_KEY,
  isFavoriteDestination,
  loadSavedDestinations,
  loadTrip,
  parseSavedDestinations,
  parseTrip,
  saveSavedDestinations,
  saveTrip,
  toggleFavoriteDestination,
  TRIP_STORAGE_KEY,
} from './storage'
import type { SavedDestinationsState, TripState } from '../types'

const validTrip: TripState = {
  version: 1,
  startedAt: 1_700_000_000_000,
  destination: { id: 'N:1', name: 'Marienplatz', label: 'Marienplatz, München', lat: 48.137, lon: 11.575 },
  selectedStation: null,
}

describe('trip persistence', () => {
  it('round-trips a valid active trip', () => {
    saveTrip(validTrip)
    expect(loadTrip()).toEqual(validTrip)
    clearTrip()
    expect(localStorage.getItem(TRIP_STORAGE_KEY)).toBeNull()
  })

  it('rejects corrupt or outdated stored state', () => {
    expect(parseTrip('{broken')).toBeNull()
    expect(parseTrip(JSON.stringify({ ...validTrip, version: 2 }))).toBeNull()
    expect(parseTrip(JSON.stringify({ ...validTrip, startedAt: 'yesterday' }))).toBeNull()
  })
})

describe('saved destination persistence', () => {
  const empty: SavedDestinationsState = { version: 1, recents: [], favorites: [] }

  it('round-trips recent destinations and favorites separately from the trip', () => {
    const destinations: SavedDestinationsState = {
      version: 1,
      recents: ['Marienplatz', 'Sendlinger Tor'],
      favorites: ['Sendlinger Tor'],
    }

    saveSavedDestinations(destinations)
    expect(loadSavedDestinations()).toEqual(destinations)
    expect(localStorage.getItem(DESTINATIONS_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(TRIP_STORAGE_KEY)).toBeNull()
  })

  it('falls back to an empty state for corrupt or invalid stored data', () => {
    expect(parseSavedDestinations('{broken')).toEqual(empty)
    expect(parseSavedDestinations(JSON.stringify({ version: 2, recents: [], favorites: [] }))).toEqual(empty)
    expect(parseSavedDestinations(JSON.stringify({ version: 1, recents: [7], favorites: [] }))).toEqual(empty)
  })

  it('keeps the five latest unique queries and preserves their latest spelling', () => {
    let destinations = empty
    for (const query of ['One', 'Two', 'Three', 'Four', 'Five', 'Six']) {
      destinations = addRecentDestination(destinations, query)
    }

    expect(destinations.recents).toEqual(['Six', 'Five', 'Four', 'Three', 'Two'])
    destinations = addRecentDestination(destinations, '  FOUR  ')
    expect(destinations.recents).toEqual(['FOUR', 'Six', 'Five', 'Three', 'Two'])
  })

  it('toggles unlimited favorites independently of recent-list eviction', () => {
    let destinations = addRecentDestination(empty, 'Home')
    destinations = toggleFavoriteDestination(destinations, 'Home')
    for (const query of ['One', 'Two', 'Three', 'Four', 'Five']) {
      destinations = addRecentDestination(destinations, query)
      destinations = toggleFavoriteDestination(destinations, query)
    }

    expect(destinations.recents).not.toContain('Home')
    expect(destinations.favorites).toEqual(['Five', 'Four', 'Three', 'Two', 'One', 'Home'])
    expect(isFavoriteDestination(destinations, ' home ')).toBe(true)

    destinations = toggleFavoriteDestination(destinations, 'HOME')
    expect(destinations.favorites).toEqual(['Five', 'Four', 'Three', 'Two', 'One'])
  })
})

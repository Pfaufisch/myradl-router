import { parseTrip, saveTrip, loadTrip, clearTrip, TRIP_STORAGE_KEY } from './storage'
import type { TripState } from '../types'

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

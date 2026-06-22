import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { TRIP_STORAGE_KEY } from './lib/storage'
import type { TripState } from './types'

const stationInformation = {
  data: {
    stations: [
      { station_id: 'station-1', short_name: '95001', name: 'Tal & Marienplatz', region_id: '1301', lat: 48.1368, lon: 11.5762 },
      { station_id: 'station-2', short_name: '95002', name: 'Viktualienmarkt', region_id: '1301', lat: 48.1354, lon: 11.576 },
    ],
  },
}

const stationStatus = {
  data: {
    stations: [
      { station_id: 'station-1', is_installed: 1, is_returning: 1, last_reported: 123 },
      { station_id: 'station-2', is_installed: 1, is_returning: 1, last_reported: 123 },
    ],
  },
}

const photonResponse = {
  features: [{
    geometry: { type: 'Point', coordinates: [11.5754, 48.1371] },
    properties: { osm_type: 'N', osm_id: 1, name: 'Marienplatz', postcode: '80331', city: 'München' },
  }],
}

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

function installFetch(status = stationStatus) {
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('photon.komoot.io')) return response(photonResponse)
    if (url.includes('station_information')) return response(stationInformation)
    if (url.includes('station_status')) return response(status)
    return response({}, 404)
  }))
}

function installGeolocation() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn((success: PositionCallback) => {
        success({ coords: { latitude: 48.14, longitude: 11.58, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition)
        return 7
      }),
      clearWatch: vi.fn(),
    },
  })
}

describe('App flow', () => {
  beforeEach(() => {
    installFetch()
    installGeolocation()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('runs from trip start through navigation and confirmed reset', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Fahrt starten/ }))
    expect(screen.getByRole('heading', { name: 'Wohin möchtest du?' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Ziel oder Adresse'), 'Marienplatz')
    await user.click(await screen.findByRole('button', { name: /Marienplatz, 80331 München/ }, { timeout: 2_000 }))
    await user.click(await screen.findByRole('button', { name: /Tal & Marienplatz/ }))

    expect(await screen.findByText('Navigation aktiv')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tal & Marienplatz' })).toBeInTheDocument()
    expect(screen.getByText('Pfeil ist nach Norden ausgerichtet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fahrt beenden' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ja, Fahrt beenden' }))
    expect(screen.getByRole('button', { name: /Fahrt starten/ })).toBeInTheDocument()
    expect(localStorage.getItem(TRIP_STORAGE_KEY)).toBeNull()
  })

  it('shows a destination-search failure', async () => {
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      if (String(input).includes('photon')) return response({}, 503)
      return response({})
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Fahrt starten/ }))
    await user.type(screen.getByLabelText('Ziel oder Adresse'), 'Sendlinger Tor')
    expect(await screen.findByText(/Zielsuche ist gerade nicht erreichbar/, {}, { timeout: 2_000 })).toBeInTheDocument()
  })

  it('restores navigation and warns when the station no longer accepts returns', async () => {
    const activeTrip: TripState = {
      version: 1,
      startedAt: Date.now() - 60_000,
      destination: { id: 'N:1', name: 'Marienplatz', label: 'Marienplatz, 80331 München', lat: 48.1371, lon: 11.5754 },
      selectedStation: { id: 'station-1', shortName: '95001', name: 'Tal & Marienplatz', regionId: '1301', lat: 48.1368, lon: 11.5762, acceptsReturns: true, lastReported: 123 },
    }
    localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(activeTrip))
    installFetch({ data: { stations: [] } })
    render(<App />)

    expect(screen.getByText('Navigation aktiv')).toBeInTheDocument()
    expect(await screen.findByText('Rückgabe hier derzeit nicht bestätigt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alternativen anzeigen' })).toBeInTheDocument()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
  })
})

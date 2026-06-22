import { useCallback, useEffect, useMemo, useState } from 'react'
import { requestCompassPermission } from './lib/compass'
import { formatDistance, formatElapsed, isBillingWarning } from './lib/geo'
import { searchDestinations } from './lib/photon'
import { fetchStations, rankStations } from './lib/stations'
import { clearTrip, loadTrip, saveTrip } from './lib/storage'
import { useGuidance } from './hooks/useGuidance'
import type {
  AppView,
  CompassPermission,
  Destination,
  RankedStation,
  Station,
  TripState,
} from './types'

function viewForTrip(trip: TripState | null): AppView {
  if (!trip) return 'start'
  if (trip.selectedStation) return 'navigation'
  if (trip.destination) return 'stations'
  return 'destination'
}

function useClock(interval = 1_000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

function BrandHeader({ trip }: { trip: TripState | null }) {
  const now = useClock()
  return (
    <header className="app-header">
      <div className="wordmark" aria-label="MyRadl Router">
        <span>myradl</span>
        <span className="wordmark-route">router</span>
      </div>
      {trip && (
        <div className="header-timer" aria-label={`Fahrzeit ${formatElapsed(now - trip.startedAt)}`}>
          <span className="timer-dot" />
          {formatElapsed(now - trip.startedAt)}
        </div>
      )}
    </header>
  )
}

function RouteIllustration() {
  return (
    <div className="route-illustration" aria-hidden="true">
      <svg viewBox="0 0 280 220">
        <path className="route-path-shadow" d="M45 180 C45 110 125 145 125 75 C125 27 230 45 230 108" />
        <path className="route-path" d="M45 180 C45 110 125 145 125 75 C125 27 230 45 230 108" />
        <circle className="route-start" cx="45" cy="180" r="15" />
        <path className="route-pin" d="M230 80c-22 0-38 17-38 38 0 29 38 66 38 66s38-37 38-66c0-21-16-38-38-38Z" />
        <circle className="route-pin-hole" cx="230" cy="118" r="13" />
      </svg>
      <span className="route-bike">↗</span>
    </div>
  )
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="screen start-screen">
      <div className="hero-copy">
        <p className="eyebrow">Einfach ans Ziel. Sicher zurück.</p>
        <h1>Deine Rückgabe&shy;station ist schon da.</h1>
        <p className="hero-description">
          Ziel eingeben, verfügbare MyRadl-Station wählen und dem Pfeil folgen.
        </p>
      </div>
      <RouteIllustration />
      <div className="bottom-action">
        <button className="primary-button" onClick={onStart}>
          Fahrt starten <span aria-hidden="true">→</span>
        </button>
        <p className="privacy-note">Kein Login · keine Standortdaten gespeichert</p>
      </div>
    </main>
  )
}

interface DestinationScreenProps {
  onBack: () => void
  onSelect: (destination: Destination) => void
}

function DestinationScreen({ onBack, onSelect }: DestinationScreenProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Destination[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 3) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        setResults(await searchDestinations(normalized, controller.signal))
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setError('Die Zielsuche ist gerade nicht erreichbar. Bitte versuche es erneut.')
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <main className="screen content-screen">
      <button className="back-button" onClick={onBack} aria-label="Zurück zum Start">
        ←
      </button>
      <div className="section-heading">
        <p className="step-label">Schritt 1 von 2</p>
        <h1>Wohin möchtest du?</h1>
        <p>Wir suchen Rückgabestationen in der Nähe deines Ziels.</p>
      </div>

      <div className="search-field-wrap">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <label className="sr-only" htmlFor="destination-search">Ziel oder Adresse</label>
        <input
          id="destination-search"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ziel oder Adresse"
        />
        {query && (
          <button className="clear-search" onClick={() => setQuery('')} aria-label="Suche leeren">×</button>
        )}
      </div>

      <div className="search-status" aria-live="polite">
        {loading && <span className="loading-line">Suche läuft …</span>}
        {error && <div className="message error-message">{error}</div>}
        {!loading && !error && query.trim().length >= 3 && results.length === 0 && (
          <p>Kein passendes Ziel gefunden. Ergänze Ort oder Postleitzahl.</p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="destination-results" aria-label="Suchergebnisse">
          {results.map((result) => (
            <li key={result.id}>
              <button onClick={() => onSelect(result)}>
                <span className="result-pin" aria-hidden="true">●</span>
                <span>
                  <strong>{result.name}</strong>
                  <small>{result.label}</small>
                </span>
                <span className="result-arrow" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="attribution">
        Zielsuche mit Photon · Daten ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap-Mitwirkende
        </a>
      </p>
    </main>
  )
}

interface StationsScreenProps {
  destination: Destination
  ranked: RankedStation[]
  loading: boolean
  error: string | null
  selectingId: string | null
  onBack: () => void
  onRetry: () => void
  onSelect: (station: Station) => void
}

function StationsScreen({
  destination,
  ranked,
  loading,
  error,
  selectingId,
  onBack,
  onRetry,
  onSelect,
}: StationsScreenProps) {
  return (
    <main className="screen content-screen stations-screen">
      <button className="back-button" onClick={onBack} aria-label="Anderes Ziel suchen">←</button>
      <div className="section-heading compact-heading">
        <p className="step-label">Schritt 2 von 2</p>
        <h1>Wo möchtest du zurückgeben?</h1>
        <div className="destination-chip">
          <span aria-hidden="true">●</span>
          <span>{destination.label}</span>
        </div>
      </div>

      <div aria-live="polite">
        {loading && (
          <div className="station-skeletons" aria-label="Stationen werden geladen">
            {[1, 2, 3].map((item) => <div className="station-skeleton" key={item} />)}
          </div>
        )}
        {error && (
          <div className="message error-message station-error">
            <strong>Stationen konnten nicht geladen werden.</strong>
            <span>{error}</span>
            <button className="text-button" onClick={onRetry}>Erneut versuchen</button>
          </div>
        )}
        {!loading && !error && ranked.length === 0 && (
          <div className="message empty-message">
            <strong>Keine verfügbare Rückgabestation gefunden.</strong>
            <span>Wähle ein anderes Ziel oder versuche es gleich noch einmal.</span>
          </div>
        )}
      </div>

      {!loading && !error && ranked.length > 0 && (
        <ol className="station-list">
          {ranked.map(({ station, distanceToDestination, walkingMinutes }, index) => (
            <li key={station.id}>
              <button
                className="station-card"
                onClick={() => onSelect(station)}
                disabled={selectingId !== null}
              >
                <span className="station-rank">{index + 1}</span>
                <span className="station-main">
                  <strong>{station.name}</strong>
                  <span className="station-live"><i /> Rückgabe möglich</span>
                  <span className="station-metrics">
                    <b>{Math.round(distanceToDestination)} m</b>
                    <span>ca. {walkingMinutes} Min. zu Fuß zum Ziel</span>
                  </span>
                </span>
                <span className="station-go" aria-hidden="true">
                  {selectingId === station.id ? '…' : '→'}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="availability-note">Live-Status von nextbike · vor der Auswahl erneut geprüft</p>
    </main>
  )
}

function DirectionArrow({ rotation, waiting }: { rotation: number; waiting: boolean }) {
  return (
    <div className={`direction-dial${waiting ? ' waiting' : ''}`}>
      <span className="north-marker">N</span>
      <svg
        className="direction-arrow"
        viewBox="0 0 180 220"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-label={waiting ? 'Richtung wird ermittelt' : 'Pfeil zeigt zur Station'}
      >
        <path d="M90 8 164 132l-48-16v96H64v-96l-48 16L90 8Z" />
      </svg>
    </div>
  )
}

interface NavigationScreenProps {
  trip: TripState & { selectedStation: Station }
  compassPermission: CompassPermission
  stationUnavailable: boolean
  statusError: string | null
  onAlternatives: () => void
  onRetryStatus: () => void
  onEnd: () => void
}

function NavigationScreen({
  trip,
  compassPermission,
  stationUnavailable,
  statusError,
  onAlternatives,
  onRetryStatus,
  onEnd,
}: NavigationScreenProps) {
  const [retryToken, setRetryToken] = useState(0)
  const now = useClock()
  const guidance = useGuidance(trip.selectedStation, compassPermission, retryToken)
  const elapsed = now - trip.startedAt
  const distance = guidance.distance === null ? null : formatDistance(guidance.distance)
  const nearby = guidance.distance !== null && guidance.distance <= 30

  const headingLabel = {
    compass: 'Kompass aktiv',
    gps: 'Fahrtrichtung per GPS',
    'north-up': 'Pfeil ist nach Norden ausgerichtet',
    waiting: 'Richtung wird ermittelt',
  }[guidance.headingSource]

  return (
    <main className="screen navigation-screen">
      <div className="nav-topline">
        <span className="live-badge"><i /> Navigation aktiv</span>
        <button className="end-link" onClick={onEnd}>Fahrt beenden</button>
      </div>

      {(stationUnavailable || statusError) && (
        <div className={`nav-alert ${stationUnavailable ? 'urgent' : ''}`} role="alert">
          <strong>{stationUnavailable ? 'Rückgabe hier derzeit nicht bestätigt' : 'Live-Status nicht aktualisiert'}</strong>
          <span>{stationUnavailable ? 'Bitte wähle eine andere Station.' : 'Die Navigation läuft mit den zuletzt geladenen Daten weiter.'}</span>
          <button onClick={stationUnavailable ? onAlternatives : onRetryStatus}>
            {stationUnavailable ? 'Alternativen anzeigen' : 'Erneut prüfen'}
          </button>
        </div>
      )}

      <div className="nav-station">
        <p>Deine Rückgabestation</p>
        <h1>{trip.selectedStation.name}</h1>
        {trip.selectedStation.shortName && <span>Station {trip.selectedStation.shortName}</span>}
      </div>

      <DirectionArrow rotation={guidance.arrowRotation} waiting={guidance.bearing === null} />

      <div className="heading-status" aria-live="polite">
        <span className={`heading-icon source-${guidance.headingSource}`} aria-hidden="true">⌁</span>
        {headingLabel}
      </div>

      {guidance.locationError ? (
        <div className="message location-error" role="alert">
          <span>{guidance.locationError}</span>
          <button className="text-button" onClick={() => setRetryToken((value) => value + 1)}>
            Standort erneut versuchen
          </button>
        </div>
      ) : (
        <div className={`nav-distance${nearby ? ' nearby' : ''}`} aria-live="polite">
          {nearby && <span className="nearby-label">Station in der Nähe</span>}
          {distance ? (
            <>
              <strong>{distance.primary}</strong>
              {distance.secondary && <span>{distance.secondary}</span>}
            </>
          ) : (
            <strong className="distance-waiting">Standort wird gesucht …</strong>
          )}
          {guidance.accuracy !== null && <small>GPS ±{Math.round(guidance.accuracy)} m</small>}
        </div>
      )}

      <div className={`rental-timer${isBillingWarning(elapsed) ? ' billing-warning' : ''}`}>
        <span>Fahrzeit</span>
        <strong>{formatElapsed(elapsed)}</strong>
        <small>Abrechnung im 30-Minuten-Takt</small>
      </div>

      <p className="return-reminder">
        <span aria-hidden="true">!</span>
        Rad innerhalb der markierten Zone abstellen, Schloss schließen und die Rückgabe in nextbike/MVGO prüfen.
      </p>
    </main>
  )
}

function EndTripDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="end-trip-title">
        <span className="dialog-icon" aria-hidden="true">✓</span>
        <h2 id="end-trip-title">Fahrt wirklich beenden?</h2>
        <p>Der Timer und dein gewähltes Ziel werden aus diesem Browser gelöscht.</p>
        <button className="primary-button" onClick={onConfirm}>Ja, Fahrt beenden</button>
        <button className="secondary-button" onClick={onCancel}>Weiter navigieren</button>
      </div>
    </div>
  )
}

export default function App() {
  const [trip, setTrip] = useState<TripState | null>(() => loadTrip())
  const [view, setView] = useState<AppView>(() => viewForTrip(loadTrip()))
  const [stations, setStations] = useState<Station[]>([])
  const [stationsLoading, setStationsLoading] = useState(false)
  const [stationsError, setStationsError] = useState<string | null>(null)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [compassPermission, setCompassPermission] = useState<CompassPermission>('prompt')
  const [stationUnavailable, setStationUnavailable] = useState(false)
  const [navigationStatusError, setNavigationStatusError] = useState<string | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)

  useEffect(() => {
    if (trip) saveTrip(trip)
    else clearTrip()
  }, [trip])

  const loadStations = useCallback(async () => {
    setStationsLoading(true)
    setStationsError(null)
    try {
      setStations(await fetchStations())
    } catch {
      setStationsError('Die nextbike-Daten sind gerade nicht erreichbar.')
    } finally {
      setStationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'stations' && trip?.destination) void loadStations()
  }, [view, trip?.destination, loadStations])

  const verifyNavigationStation = useCallback(async () => {
    if (!trip?.selectedStation) return
    try {
      const freshStations = await fetchStations()
      const freshSelection = freshStations.find((station) => station.id === trip.selectedStation?.id)
      setStationUnavailable(!freshSelection)
      setNavigationStatusError(null)
      if (freshSelection) {
        setTrip((current) => current ? { ...current, selectedStation: freshSelection } : current)
      }
    } catch {
      setNavigationStatusError('Die nextbike-Daten sind gerade nicht erreichbar.')
    }
  }, [trip?.selectedStation?.id])

  useEffect(() => {
    if (view !== 'navigation' || !trip?.selectedStation) return
    void verifyNavigationStation()
    const interval = window.setInterval(() => void verifyNavigationStation(), 60_000)
    return () => window.clearInterval(interval)
  }, [view, trip?.selectedStation?.id, verifyNavigationStation])

  const rankedStations = useMemo(
    () => (trip?.destination ? rankStations(stations, trip.destination) : []),
    [stations, trip?.destination],
  )

  const startTrip = () => {
    setTrip({ version: 1, startedAt: Date.now(), destination: null, selectedStation: null })
    setView('destination')
  }

  const chooseDestination = (destination: Destination) => {
    setTrip((current) => current ? { ...current, destination, selectedStation: null } : current)
    setView('stations')
  }

  const chooseStation = async (station: Station) => {
    setSelectingId(station.id)
    setStationsError(null)
    const permissionPromise = requestCompassPermission()
    try {
      const freshStations = await fetchStations()
      setStations(freshStations)
      const verified = freshStations.find((candidate) => candidate.id === station.id)
      if (!verified) {
        setStationsError('Diese Station nimmt aktuell keine Rückgaben an. Bitte wähle eine andere.')
        return
      }
      setCompassPermission(await permissionPromise)
      setTrip((current) => current ? { ...current, selectedStation: verified } : current)
      setStationUnavailable(false)
      setNavigationStatusError(null)
      setView('navigation')
    } catch {
      setStationsError('Der Live-Status konnte nicht bestätigt werden. Bitte versuche es erneut.')
    } finally {
      setSelectingId(null)
    }
  }

  const showAlternatives = () => {
    setTrip((current) => current ? { ...current, selectedStation: null } : current)
    setView('stations')
  }

  const finishTrip = () => {
    setShowEndDialog(false)
    setTrip(null)
    setStations([])
    setCompassPermission('prompt')
    setView('start')
  }

  return (
    <div className={`app-shell view-${view}`}>
      <BrandHeader trip={trip} />
      {view === 'start' && <StartScreen onStart={startTrip} />}
      {view === 'destination' && (
        <DestinationScreen
          onBack={() => setShowEndDialog(true)}
          onSelect={chooseDestination}
        />
      )}
      {view === 'stations' && trip?.destination && (
        <StationsScreen
          destination={trip.destination}
          ranked={rankedStations}
          loading={stationsLoading}
          error={stationsError}
          selectingId={selectingId}
          onBack={() => setView('destination')}
          onRetry={loadStations}
          onSelect={chooseStation}
        />
      )}
      {view === 'navigation' && trip?.selectedStation && (
        <NavigationScreen
          trip={trip as TripState & { selectedStation: Station }}
          compassPermission={compassPermission}
          stationUnavailable={stationUnavailable}
          statusError={navigationStatusError}
          onAlternatives={showAlternatives}
          onRetryStatus={verifyNavigationStation}
          onEnd={() => setShowEndDialog(true)}
        />
      )}
      {showEndDialog && <EndTripDialog onCancel={() => setShowEndDialog(false)} onConfirm={finishTrip} />}
    </div>
  )
}

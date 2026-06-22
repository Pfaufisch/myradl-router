import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompassPermission, Coordinates, HeadingSource } from '../types'
import { headingFromOrientation } from '../lib/compass'
import {
  bearingDegrees,
  haversineMeters,
  relativeArrowRotation,
  smoothHeading,
} from '../lib/geo'

interface GuidanceState {
  position: Coordinates | null
  accuracy: number | null
  heading: number | null
  headingSource: HeadingSource
  distance: number | null
  bearing: number | null
  arrowRotation: number
  locationError: string | null
}

function screenOrientationAngle(): number {
  const angle = window.screen.orientation?.angle
  if (typeof angle === 'number') return angle
  return typeof (window as Window & { orientation?: number }).orientation === 'number'
    ? (window as Window & { orientation?: number }).orientation!
    : 0
}

export function useGuidance(
  target: Coordinates,
  compassPermission: CompassPermission,
  retryToken = 0,
): GuidanceState {
  const [position, setPosition] = useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [headingSource, setHeadingSource] = useState<HeadingSource>('waiting')
  const [locationError, setLocationError] = useState<string | null>(null)
  const compassSeen = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Dieses Gerät stellt keinen Standort bereit.')
      return
    }

    setLocationError(null)
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lon: coords.longitude })
        setAccuracy(coords.accuracy)

        if (!compassSeen.current && coords.heading !== null && Number.isFinite(coords.heading)) {
          setHeading((previous) => smoothHeading(previous, coords.heading!))
          setHeadingSource('gps')
        }
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Standortzugriff wurde abgelehnt. Bitte in den Browser-Einstellungen erlauben.',
          2: 'Dein Standort ist gerade nicht verfügbar.',
          3: 'Die Standortabfrage hat zu lange gedauert.',
        }
        setLocationError(messages[error.code] ?? 'Standort konnte nicht bestimmt werden.')
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [retryToken])

  useEffect(() => {
    if (compassPermission !== 'granted') {
      if (compassPermission === 'denied' || compassPermission === 'unsupported') {
        setHeadingSource('north-up')
      }
      return
    }

    const eventName = 'ondeviceorientationabsolute' in window
      ? 'deviceorientationabsolute'
      : 'deviceorientation'
    const handleOrientation = (event: Event) => {
      const nextHeading = headingFromOrientation(
        event as DeviceOrientationEvent,
        screenOrientationAngle(),
      )
      if (nextHeading === null) return
      compassSeen.current = true
      setHeading((previous) => smoothHeading(previous, nextHeading))
      setHeadingSource('compass')
    }

    window.addEventListener(eventName, handleOrientation)
    return () => window.removeEventListener(eventName, handleOrientation)
  }, [compassPermission])

  const bearing = useMemo(
    () => (position ? bearingDegrees(position, target) : null),
    [position, target.lat, target.lon],
  )
  const distance = useMemo(
    () => (position ? haversineMeters(position, target) : null),
    [position, target.lat, target.lon],
  )

  return {
    position,
    accuracy,
    heading,
    headingSource:
      bearing !== null && heading === null && headingSource === 'waiting' ? 'north-up' : headingSource,
    distance,
    bearing,
    arrowRotation:
      bearing === null ? 0 : heading === null ? bearing : relativeArrowRotation(bearing, heading),
    locationError,
  }
}

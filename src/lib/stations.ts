import type { Coordinates, RankedStation, Station } from '../types'
import { haversineMeters, walkingMinutes } from './geo'

export const STATION_INFORMATION_URL =
  'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_ml/de/station_information.json'
export const STATION_STATUS_URL =
  'https://gbfs.nextbike.net/maps/gbfs/v1/nextbike_ml/de/station_status.json'

interface StationInformationResponse {
  data?: {
    stations?: Array<{
      station_id?: string
      short_name?: string
      name?: string
      region_id?: string
      lat?: number
      lon?: number
    }>
  }
}

interface StationStatusResponse {
  data?: {
    stations?: Array<{
      station_id?: string
      is_installed?: number
      is_returning?: number
      last_reported?: number
    }>
  }
}

function assertOk(response: Response): Response {
  if (!response.ok) throw new Error(`API antwortet mit Status ${response.status}`)
  return response
}

export function joinStationFeeds(
  information: StationInformationResponse,
  status: StationStatusResponse,
): Station[] {
  const statuses = new Map(
    (status.data?.stations ?? [])
      .filter((item) => typeof item.station_id === 'string')
      .map((item) => [item.station_id!, item]),
  )

  return (information.data?.stations ?? []).flatMap((info) => {
    if (
      typeof info.station_id !== 'string' ||
      typeof info.name !== 'string' ||
      typeof info.lat !== 'number' ||
      typeof info.lon !== 'number' ||
      !Number.isFinite(info.lat) ||
      !Number.isFinite(info.lon)
    ) {
      return []
    }

    const live = statuses.get(info.station_id)
    if (!live || live.is_installed !== 1 || live.is_returning !== 1) return []

    return [
      {
        id: info.station_id,
        shortName: info.short_name ?? '',
        name: info.name,
        regionId: info.region_id ?? '',
        lat: info.lat,
        lon: info.lon,
        acceptsReturns: true,
        lastReported: live.last_reported ?? 0,
      },
    ]
  })
}

export async function fetchStations(signal?: AbortSignal): Promise<Station[]> {
  const [informationResponse, statusResponse] = await Promise.all([
    fetch(STATION_INFORMATION_URL, { cache: 'no-store', signal }).then(assertOk),
    fetch(STATION_STATUS_URL, { cache: 'no-store', signal }).then(assertOk),
  ])

  const [information, status] = (await Promise.all([
    informationResponse.json(),
    statusResponse.json(),
  ])) as [StationInformationResponse, StationStatusResponse]

  return joinStationFeeds(information, status)
}

export function rankStations(
  stations: Station[],
  destination: Coordinates,
  limit = 5,
): RankedStation[] {
  return stations
    .map((station) => {
      const distanceToDestination = haversineMeters(station, destination)
      return {
        station,
        distanceToDestination,
        walkingMinutes: walkingMinutes(distanceToDestination),
      }
    })
    .sort((a, b) => a.distanceToDestination - b.distanceToDestination)
    .slice(0, limit)
}

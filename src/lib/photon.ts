import type { Destination } from '../types'

export const PHOTON_URL = 'https://photon.komoot.io/api/'

interface PhotonFeature {
  geometry?: { type?: string; coordinates?: unknown[] }
  properties?: {
    osm_type?: string
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    district?: string
    state?: string
    country?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

function destinationLabel(properties: NonNullable<PhotonFeature['properties']>): string {
  const street = [properties.street, properties.housenumber].filter(Boolean).join(' ')
  const place = [properties.postcode, properties.city].filter(Boolean).join(' ')
  const parts = [properties.name, street, properties.district, place]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)

  return parts.join(', ')
}

export async function searchDestinations(query: string, signal?: AbortSignal): Promise<Destination[]> {
  const parameters = new URLSearchParams({
    q: query,
    limit: '5',
    lang: 'de',
    lat: '48.1372',
    lon: '11.5756',
  })

  const response = await fetch(`${PHOTON_URL}?${parameters}`, { signal })
  if (!response.ok) throw new Error(`Suche antwortet mit Status ${response.status}`)

  const payload = (await response.json()) as PhotonResponse
  return (payload.features ?? []).flatMap((feature, index) => {
    const coordinates = feature.geometry?.coordinates
    const properties = feature.properties
    const lon = coordinates?.[0]
    const lat = coordinates?.[1]
    const streetAddress = [properties?.street, properties?.housenumber]
      .filter(Boolean)
      .join(' ')
    const name = properties?.name?.trim() || streetAddress

    if (
      feature.geometry?.type !== 'Point' ||
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !properties ||
      !name
    ) {
      return []
    }

    return [
      {
        id: `${properties.osm_type ?? 'result'}:${properties.osm_id ?? 'unknown'}:${index}`,
        name,
        label: destinationLabel(properties),
        lat,
        lon,
      },
    ]
  })
}

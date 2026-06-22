import { searchDestinations } from './photon'

describe('destination search', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates stable unique result ids when Photon repeats an OSM object', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      features: [
        { geometry: { type: 'Point', coordinates: [11.575, 48.137] }, properties: { osm_type: 'R', osm_id: 42, name: 'Marienplatz', city: 'München' } },
        { geometry: { type: 'Point', coordinates: [11.576, 48.138] }, properties: { osm_type: 'R', osm_id: 42, name: 'Marienplatz', city: 'München' } },
      ],
    }), { status: 200 }))))

    const results = await searchDestinations('Marienplatz')
    expect(results).toHaveLength(2)
    expect(new Set(results.map(({ id }) => id)).size).toBe(2)
  })

  it('keeps house-address results that have no name property', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      features: [{
        geometry: { type: 'Point', coordinates: [11.5293053, 48.0980403] },
        properties: {
          osm_type: 'N',
          osm_id: 11969200083,
          street: 'Hofmannstraße',
          housenumber: '39',
          postcode: '81379',
          city: 'München',
          district: 'Obersendling',
        },
      }],
    }), { status: 200 }))))

    await expect(searchDestinations('hofmannstraße 39')).resolves.toEqual([{
      id: 'N:11969200083:0',
      name: 'Hofmannstraße 39',
      label: 'Hofmannstraße 39, Obersendling, 81379 München',
      lat: 48.0980403,
      lon: 11.5293053,
    }])
  })
})

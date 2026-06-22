import { joinStationFeeds, rankStations } from './stations'

const information = {
  data: {
    stations: [
      { station_id: 'a', short_name: '95001', name: 'Nah', region_id: '1301', lat: 48.137, lon: 11.576 },
      { station_id: 'b', short_name: '95002', name: 'Gesperrt', region_id: '1301', lat: 48.14, lon: 11.58 },
      { station_id: 'c', short_name: '95003', name: 'Weiter', region_id: '1301', lat: 48.15, lon: 11.6 },
      { station_id: 'invalid', name: 'Kaputt', lat: Number.NaN, lon: 11.6 },
    ],
  },
}

describe('station feeds', () => {
  it('joins feeds and excludes stations not accepting returns', () => {
    const stations = joinStationFeeds(information, {
      data: {
        stations: [
          { station_id: 'a', is_installed: 1, is_returning: 1, last_reported: 123 },
          { station_id: 'b', is_installed: 1, is_returning: 0, last_reported: 123 },
          { station_id: 'c', is_installed: 0, is_returning: 1, last_reported: 123 },
        ],
      },
    })

    expect(stations).toEqual([
      {
        id: 'a',
        shortName: '95001',
        name: 'Nah',
        regionId: '1301',
        lat: 48.137,
        lon: 11.576,
        acceptsReturns: true,
        lastReported: 123,
      },
    ])
  })

  it('ranks the nearest five stations to the destination', () => {
    const stations = Array.from({ length: 7 }, (_, index) => ({
      id: String(index), shortName: String(index), name: String(index), regionId: '1301',
      lat: 48.137 + index * 0.001, lon: 11.576, acceptsReturns: true, lastReported: 1,
    }))
    const ranked = rankStations(stations, { lat: 48.137, lon: 11.576 })
    expect(ranked).toHaveLength(5)
    expect(ranked.map(({ station }) => station.id)).toEqual(['0', '1', '2', '3', '4'])
    expect(ranked[0].walkingMinutes).toBe(1)
  })
})

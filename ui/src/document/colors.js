
import r from '../lib/database'
import redis from '../lib/redis'
import co from 'co'

const ColorsGames = r.table('ColorsGames')
export default ColorsGames

export const colorsStateActive = 'ACTIVE'
export const colorsStateOver = 'OVER'

export function getCurrentColorsGame() {
  return co(function* () {
    const games = yield ColorsGames.getAll(colorsStateActive, { index: 'state' })
    if(!games.length) {
      return null
    }

    return games[0]
  })
}

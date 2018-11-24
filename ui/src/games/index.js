
import co from 'co'
import redis from '../lib/redis'

export const COINFLIP_GAME  = 1
export const COLORS_GAME  = 2
export const JACKPOT_GAME  = 3
export const SMALL_JACKPOT_GAME = 5
export const TOWERS_GAME  = 7
export const RAFFLES_GAME  = 100

export function isGameDisabled(id) {
  return co(function* () {
    const disabled = yield redis.getAsync(`game:toggle:${id}`)
    return !!disabled
  })
}

export default [
  COLORS_GAME,
  JACKPOT_GAME,
  SMALL_JACKPOT_GAME,
  TOWERS_GAME,
  RAFFLES_GAME,
  COINFLIP_GAME
]

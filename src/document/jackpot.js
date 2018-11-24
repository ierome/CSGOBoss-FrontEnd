
import r from '../lib/database'
import redis from '../lib/redis'
import co from 'co'

const JackpotGames = r.table('JackpotGames')
export default JackpotGames

export const jackpotStateActive = 'ACTIVE'

export const jackpotStageNotStarted = 'NOT_STARTED'
export const jackpotStageStarting = 'STARTING'
export const jackpotStageInProgress = 'PROGRESS'
export const jackpotStageOver = 'OVER'

export function getCurrentJackpotGame(gameType) {
  return co(function* () {
    const games = yield JackpotGames.getAll([ gameType, jackpotStateActive ], { index: 'gameTypeState' })
    if(!games.length) {
      return null
    }

    return games[0]
  })
}

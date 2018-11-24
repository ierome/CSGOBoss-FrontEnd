
import r from '../lib/database'
import co from 'co'

const CoinflipGames = r.table('CoinflipGames')
export default CoinflipGames

export const stateWaitingJoin = 'WAITING_JOIN'
export const stateJoining = 'JOINING'
export const stateJoined = 'JOINED'
export const stateOver = 'OVER'
export const stateFlipping = 'FLIPPING'
export const stateExpired = 'EXPIRED'
export const stateUnlisted = 'UNLISTED'

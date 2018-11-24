
import moment from 'moment'
import _ from 'underscore'
import co from 'co'

import r from '../lib/database'

const Stats = r.table('Stats')
export default Stats

export const PlayerStats = r.table('PlayerStats')

function formatStats(stats, inserting, scope) {
  const row = scope || r.row

  const counters = _
    .chain(Object.keys(stats.counters || {}))
    .filter(k => stats.counters[k] !== 0)
    .map(k => ([k, inserting ? stats.counters[k] : row(k).default(0).add(stats.counters[k])]))
    .object()
    .value()

  return {
    ...counters
  }
}

export function getDailyStats() {
  const id = moment().startOf('day').format('YYYY-MM-DD')
  return Stats.get(id)
}

export function addStats(stats) {
  const id = moment().startOf('day').format('YYYY-MM-DD')

  return Stats.get(id).replace(s =>
    r.branch(s.eq(null), {
      id,
      createdAt: new Date(),
      ...formatStats(stats, true)
    }, s.merge({
      id,
      ...formatStats(stats, false, s)
    }))
  )
}

export function getDailyStatId(id) {
  return `${id}-${moment().startOf('day').format('YYYY-MM-DD')}`
}

export function addPlayerStats(playerId, stats) {
  const id = getDailyStatId(playerId)

  return PlayerStats.get(id).replace(s =>
    r.branch(s.eq(null), {
      id,
      playerId,
      createdAt: new Date(),
      ...formatStats(stats, true)
    }, s.merge({
      id,
      ...formatStats(stats, false, s)
    }))
  )
}


import is from 'is_js'
import r from '../lib/database'
import co from 'co'

import ChatHistory from './chatHistory'
import sockets from '../lib/sockets'

const Player = r.table('Players')
export default Player

export const PlayerBalanceHistory = r.table('PlayerBalanceHistory')

export function mutePlayer(id, duration, reason = '') {
  if(!is.string(id)) {
    return Promise.reject('invalid id')
  } else if(!is.number(duration) || duration <= 0) {
    return Promise.reject('invalid duration')
  } else if(!!reason && !is.string(reason)) {
    return Promise.reject('invalid reason')
  }

  return co(function* () {
    const response = yield Player.get(id).update({
      muted: true,
      muteReason: reason,
      muteDuration: duration,
      muteExpiration: new Date(Date.now() + duration)
    }).run()

    const ts = Math.round(new Date().getTime() / 1000) - (24 * 3600)

    yield ChatHistory
      .between([ r.minval, ts], [ r.maxval, r.maxval ], { index: 'chatChannelCreatedAt' })
      .filter({
        steamId: id
      })
      .orderBy(r.asc('createdAt'))
      .limit(40)
      .delete()
      .run()

    return response
  })

  return Player.update({
    muted: true,
    muteReason: reason,
    muteDuration: duration,
    muteExpiration: new Date(Date.now() + duration)
  }).run()
}

export function takePlayerBalance(id, amount, options = {}) {
  const meta = options.meta || {}
  const extraUpdate = options.extraUpdate || {}

  return Player
    .get(id)
    .update(player =>
      r.branch(player('balance').ge(amount), {
        ...(!!extraUpdate ? extraUpdate(player) : {}),

        balance: player('balance').sub(amount)
      }, {})
    , {
      returnChanges: true,
      // ... bad idea?
      durability: 'soft'
    })
    .run()
    .then(response => {
      const { replaced, changes } = response

      if(replaced > 0) {
        sockets.to(id).emit('updatePlayer', {
          balance: changes[0].new_val.balance
        })
      }

      PlayerBalanceHistory.insert({
        meta,
        amount: -amount,

        createdAt: new Date(),
        playerId: id,
      }).run()

      return response
    })
}

export function givePlayerBalance(id, amount, options = {}) {
  const meta = options.meta || {}

  return Player
    .get(id)
    .update({
      balance: r.row('balance').add(amount)
    }, {
      returnChanges: true,
      // ... bad idea?
      durability: 'soft'
    })
    .run()
    .then(response => {
      const { replaced, changes } = response

      if(replaced > 0) {
        sockets.to(id).emit('updatePlayer', {
          balance: changes[0].new_val.balance
        })
      }

      PlayerBalanceHistory.insert({
        meta,
        amount,

        createdAt: new Date(),
        playerId: id,
      }).run()

      return response
    })
}

export function getPlayerRaffleModifier(name) {
  return name.toLowerCase().indexOf('csgoboss') >= 0 ? 2 : 1
}

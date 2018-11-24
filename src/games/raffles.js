
import { Router } from 'express'
import co from 'co'
import schedule from 'node-schedule'
import _ from 'underscore'
import numeral from 'numeral'
import moment from 'moment'

import { RAFFLES_GAME } from './'
import sockets from '../lib/sockets'
import logger from '../lib/logger'
import Raffles from '../document/raffles'
import Player, { givePlayerBalance } from '../document/player'

const raffleTimers = {}

function scheduleRaffle(raffle) {
  if(typeof raffleTimers[raffle.id] !== 'undefined') {
    raffleTimers[raffle.id].cancel()
  }

  if(raffle.endDate <= new Date()) {
    onRaffleTimer(raffle.id)
    return
  }

  raffleTimers[raffle.id] = schedule.scheduleJob(new Date(raffle.endDate.getTime() + 5000), () => onRaffleTimer(raffle.id))
}

function onRaffleTimer(id) {

  co(function* () {
    const raffle = yield Raffles.get(id)
    if(!raffle) {
      return
    }

    const rand = Math.random()
    const winningTicket = raffle.totalTickets * rand
    logger.info(`Selecting raffle winner with random ${rand}. Winning ticket: ${winningTicket}`)

    let ticketStart = 0

    const entries = _
      .chain(raffle.entries)
      .map((v, k) => [ k, v ])
      .shuffle()
      .map(p => {
        ticketStart += p[1]

        return {
          steamId: p[0],
          tickets: p[1],
          ticketStart: ticketStart - p[1],
          ticketEnd: ticketStart
        }
      })
      .value()

    const winner = entries.reduce((w, e) => !w ? winningTicket >= e.ticketStart && winningTicket < e.ticketEnd ? e : null : w, null)
    if(!winner) {
      logger.error(`onRaffleTimer cannot find winner`, {
        raffleId: id
      })

      return
    }

    const player = yield Player.get(winner.steamId)
    if(!player) {
      logger.error(`onRaffleTimer cannot find winner player`, {
        steamId: winner.steamId,
        raffleId: id
      })

      return
    }

    const winningChance = winner.tickets / raffle.totalTickets

    sockets.emit('chatMessage', {
      name: 'CSGOBOSS RAFFLE WINNER',
      styles: {
        container: {
          background: '#5f36a9'
        },

        message: {
          fontWeight: '900',
          color: '#fff'
        }
      },

      avatar: player.avatarFull,
      message: `${player.displayName} just won the raffle for ${numeral(raffle.tokenPrize).format('0,0.00')}T with a ${numeral(winningChance).format('0.00[0000]%')} chance!`
    })

    yield givePlayerBalance(player.id, raffle.tokenPrize, {
      meta: {
        raffleId: id,
        description: 'Raffle Winner'
      }
    })

    const update = {
      state: 'FINISHED',
      winner: {
        id: player.id,
        name: player.displayName,
        avatar: player.avatarFull,
        chance: winningChance * 100,
        tickets: winner.tickets
      }
    }

    yield Raffles.get(id).update(update)

    sockets.emit('rafflesChanged', {
      ...update,

      id: raffle.id
    })
  })

  .catch(err => {
    logger.error(`onRaffleTimer ${err.stack || err}`)
  })
}

export default {
  name: 'raffles',

  run: function* () {
    const active = yield Raffles.getAll('ACTIVE', { index: 'state' })

    active.forEach(active =>
      scheduleRaffle(active)
    )

    const cursor = yield Raffles.changes({
      includeTypes: true
    })

    cursor.each((err, change) => {
      co(function* () {
        const raffle = change.new_val
        const oldRaffle = change.old_val

        if(change.type === 'add') {
          sockets.emit('newRaffle', _.pick(raffle, 'id', 'createdAt', 'endDate', 'state', 'tokenPrize', 'totalTickets', 'entries'))

          sockets.emit('chatMessage', {
            name: 'CSGOBOSS RAFFLES',
            styles: {
              container: {
                background: '#5f36a9'
              },

              message: {
                fontWeight: '900',
                color: '#fff'
              }
            },

            message: `A raffle for ${numeral(raffle.tokenPrize).format('0,0.00')}T has started and will end ${moment(raffle.endDate).fromNow()}. Good luck!`
          })

          scheduleRaffle(raffle)
        } else if(change.type === 'change') {
          sockets.emit('rafflesChanged', {
            id: raffle.id,
            totalTickets: raffle.totalTickets
          })
        }
      })

      .catch(err => {
        logger.error(`raffles run() ${err.stack || err}`)
      })
    })
  },

  router() {
    const router = Router()
    return router
  }

}

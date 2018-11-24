
import { Router } from 'express'
import co from 'co'
import is from 'is_js'

import { ensureAuthenticated } from '../lib/middleware'
import Raffles from '../document/raffles'
import Player from '../document/player'
import logger from '../lib/logger'
import sockets from '../lib/sockets'
import r from '../lib/database'

function postApplyTickets(req, res) {
  const raffleTickets = parseInt(req.body.raffleTickets)

  if(raffleTickets <= 0) {
    return res.status(400).send('Invalid amount of raffle tickets')
  }

  co(function* () {
    const raffle = yield Raffles.get(req.params.id)
    if(!raffle || raffle.state !== 'ACTIVE' || Date.now() > raffle.endDate.getTime()) {
      return res.status(400).send('Raffle has already ended or cannot be found')
    }

    const { replaced, changes } = yield Player.get(req.user.id).update(r.branch(r.row('raffleTickets').default(0).ge(raffleTickets), {
      raffleTickets: r.row('raffleTickets').default(0).sub(raffleTickets)
    }, { }), {
      returnChanges: true
    })

    if(replaced <= 0) {
      return res.status(400).send('You don\'t have enough raffle tickets')
    }

    const result = yield Raffles.get(req.params.id).update(r.branch( r.row('state').eq('ACTIVE').and(r.row('endDate').gt(new Date())), {
      totalTickets: r.row('totalTickets').add(raffleTickets),
      entries: r.row('entries').merge(e => ({
        [req.user.id]: e(req.user.id).default(0).add(raffleTickets)
      }))
    }, {}), {
      returnChanges: true
    })

    if(result.replaced <= 0) {
      yield Player.get(req.user.id).update({
        raffleTickets: r.row('raffleTickets').add(raffleTickets)
      })

      return res.status(400).send('Raffle has already ended or cannot be found')
    }

    sockets.to(req.user.id).emit('updatePlayer', {
      raffleTickets: changes[0].new_val.raffleTickets
    })

    sockets.to(req.user.id).emit('rafflesChanged', {
      id: raffle.id,
      entries: {
        [req.user.id]: result.changes[0].new_val.entries[req.user.id]
      }
    })

    res.json({
      success: true
    })
  })

  .catch(err => {
    logger.error(`postApplyTickets ${err.stack || err}`, {
      raffleTickets,
      playerId: req.user.id
    })

    res.status(400).send('Please try again later')
  })
}

export default () => {
  const router = Router()
  router.post('/apply/:id', ensureAuthenticated, postApplyTickets)
  return router
}

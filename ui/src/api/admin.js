
import { Router } from 'express'
import co from 'co'
import parseDuration from 'parse-duration'
import is from 'is_js'
import moment from 'moment'

import Player, { PlayerBalanceHistory, mutePlayer } from '../document/player'
import Campaign from '../document/campaign'
import Raffles from '../document/raffles'
import { addStats, getDailyStats } from '../document/stats'
import sockets from '../lib/sockets'
import logger from '../lib/logger'
import r from '../lib/database'
import * as sknexchange from '../lib/sknexchange'

function postMutePlayer(req, res) {
  let { reason, duration } = req.body

  if(!is.string(reason) || !is.string(duration)) {
    res.status(400).send('Invalid reason or duration')
    return
  }

  reason = reason.substring(0, 255)

  co(function* () {
    sockets.of('/').emit('deleteChatMessages', req.params.id)

    const { replaced } = yield mutePlayer(req.params.id, parseDuration(duration), reason)

    res.json({
      success: replaced > 0
    })
  })

  .catch(err =>
    logger.error(`postMutePlayer() ${err}`)
  )
}

function getProfit(req, res) {
  co(function* () {
    const stats = yield getDailyStats()

    const extraStats = yield r.expr({
      playerCount: Player.count(),
      floatingTokens: Player.sum('balance'),
    })

    res.json({
      ...stats,
      ...extraStats
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getProfit() ${err.stack || err}`)
  })
}

function postLogStatistic(req, res) {
  const { amount } = req.body

  co(function* () {
    yield addStats({
      counters: {
        totalProfit: amount,
        miscProfit: amount
      }
    })

    res.json({
      success: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getProfit() ${err.stack || err}`)
  })
}

function getPlayers(req, res) {
  co(function* () {
    let q = Player.filter(r.row('displayName').match(req.params.query))

    if(!!req.query.steamId) {
      q = Player.getAll(req.params.query)
    }

    const players = yield q.map(p => p.merge({
      campaigns: Campaign.getAll(p('id'), { index: 'linkedTo' }).coerceTo('array')
    }))

    res.json(players)
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getProfit() ${err.stack || err}`)
  })
}

function postUpdatePlayer(req, res) {
  co(function* () {
    const valid = ['mod', 'youtubePartner', 'transferLock', 'balance']

    for(let k in req.body) {
      if(valid.indexOf(k) < 0) {
        return res.status(400).send('Invalid request')
      }
    }

    const amount = req.body.balance

    if(!!req.body.balance) {
      req.body.balance = r.row('balance').default(0).add(req.body.balance)
    }

    const result = yield Player.get(req.params.id).update(req.body, {
      returnChanges: true
    })

    if(!!req.body.balance) {
      yield PlayerBalanceHistory.insert({
        meta: {
          fromAdmin: true,
          givenBy: req.user.id
        },
        amount: amount,

        createdAt: new Date(),
        playerId: req.params.id,
      })
    }

    res.json(result.changes[0].new_val)
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postUpdatePlayer() ${err.stack || err}`)
  })
}

function getBots(req, res) {
  co(function* () {
    const bots = yield sknexchange.getBots()
    res.json({
      bots
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getBots() ${err.stack || err}`)
  })
}

function postOfferRefund(req, res) {
  co(function* () {
    const resposne = yield sknexchange.refundOffer(req.body.id, {
      adminRefund: true,
      refundedBy: req.user.id
    })

    res.json(resposne)
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postOfferRefund() ${err.stack || err}`)
  })
}

function getOffers(req, res) {
  co(function* () {
    const offers = yield sknexchange.getOffers(req.params.id)
    res.json({
      offers
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getOffers() ${err.stack || err}`)
  })
}

function postCreateRaffle(req, res) {
  const { prize, endDate } = req.body

  if(!is.number(prize) || !is.string(endDate)) {
    return res.status(400).send('Invalid request')
  }

  co(function* () {
    const date = moment(endDate, 'MM/DD/YYYY hh:mm a')
    if(!date || date.isBefore(moment())) {
      return res.status(400).send('Date must be in the future')
    }

    const newRaffle = {
      createdAt: new Date(),
      endDate: date.toDate(),
      playerId: req.user.id,
      tokenPrize: prize,
      maxWinners: 3,
      totalTickets: 0,
      totalEntries: 0,
      entries: {},
      state: 'ACTIVE'
    }

    const { generated_keys: [ id ] } = yield Raffles.insert(newRaffle)
    newRaffle.id = id

    res.json({
      raffle: newRaffle
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postCreateRaffle ${err.stack || err}`)
  })
}

function getRaffles(req, res) {
  co(function* () {
    const raffles = yield Raffles.orderBy(r.desc('createdAt')).limit(50)

    res.json({
      raffles
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postCreateRaffle ${err.stack || err}`)
  })
}

export default () => {
  const router = Router()
  router.post('/mute/:id', postMutePlayer)
  router.get('/profit', getProfit)
  router.post('/offers/refund', postOfferRefund)
  router.get('/offers/:id', getOffers)
  router.get('/bots', getBots)
  router.post('/logStatistic', postLogStatistic)
  router.get('/players/:query', getPlayers)
  router.post('/updatePlayer/:id', postUpdatePlayer)

  router.post('/createRaffle', postCreateRaffle)
  router.get('/raffles', getRaffles)

  return router
}

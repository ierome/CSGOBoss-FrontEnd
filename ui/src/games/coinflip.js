
import { Router } from 'express'
import co from 'co'
import config from 'config'
import is from 'is_js'
import numeral from 'numeral'
import random from 'random-seed'
import crypto from 'crypto'
import { mapSeries } from 'async'
import _ from 'underscore'
import schedule from 'node-schedule'

import { COINFLIP_GAME } from '../games'
import { fetchInventory, deposit, cancelOffer, refundOffer, withdraw } from '../lib/sknexchange'
import { ensureAuthenticated, ensureGameEnabled } from '../lib/middleware'
import { tokensAmount } from '../lib/tokens'
import r from '../lib/database'
import Player, { PlayerBalanceHistory, takePlayerBalance, getPlayerRaffleModifier } from '../document/player'
import CoinflipGames, { stateWaitingJoin, stateJoined, stateFlipping, stateOver, stateJoining, stateExpired, stateUnlisted } from '../document/coinflip'
import { addStats, addPlayerStats } from '../document/stats'
import redis from '../lib/redis'
import logger from '../lib/logger'
import sockets from '../lib/sockets'

const coinflipSides = [ 'T', 'CT' ]
const availableStates = [stateWaitingJoin, stateJoining, stateJoined, stateFlipping]

const timers = {}

function scheduleGame(game) {
  if(!!timers[game.id]) {
    timers[game.id].cancel()
  }

  let endDate = null

  if(game.state === stateJoining) {
    endDate = game.joinExpiration
  } else if(game.state === stateJoined) {
    endDate = game.flipAt
  } else if(game.state === stateFlipping) {
    endDate = game.endsAt
  } else if(availableStates.indexOf(game.state) >= 0) {
    endDate = game.expiration
  }

  if(endDate !== null) {
    if(endDate.getTime() <= Date.now()) {
      return onGameTimer(game.id)
    }

    timers[game.id] = schedule.scheduleJob(endDate, () => onGameTimer(game.id))
  }
}

const broadcaseCoinflipStatsThrottled = _.throttle(broadcaseCoinflipStats, 300)

function broadcaseCoinflipStats() {
  CoinflipGames
    .getAll(stateWaitingJoin, stateJoined, stateJoining, stateFlipping, { index: 'state' })
    .sum('subtotal')
    .then(subtotal =>
      sockets.emit('gameStatistic', {
        coinflip: subtotal
      })
    )
}

function onGameTimer(id) {
  co(function* () {
    const game = yield CoinflipGames.get(id)
    if(!game) {
      return
    }

    logger.info(`Game timer ${id} -> ${game.state}`)

    if(game.state === stateFlipping) {
      sockets.to(game.winner.id).emit('notify', {
        status: 'success',
        message: `Congratulations, You just won a ${numeral(game.reward).format('0,00.00')}T coin flip! You will receive an offer with winning items shortly.`,
      })

      const availableSkins   = _.object(game.items.map(i => [i.id, i]))
      const winnerSkins = []

      // Include the winners skins
      game.winner.items.forEach(item => {
        winnerSkins.push(availableSkins[item.id])
        delete availableSkins[item.id]
      })

      const pot = _.reduce(availableSkins, (t, s) => t + s.price, 0)
      const fee = pot * config.games.coinflip.fee
      let remainingFee = fee

      const profitSkins = []
      while(Object.keys(availableSkins).length > 0 && remainingFee > 0) {
        const skins = _.values(availableSkins)
        const expensive = skins.reduce((s, o) => o.price > s.price ? o : s, skins[0])
        if(expensive.price > remainingFee) {
          winnerSkins.push(expensive)
          delete availableSkins[expensive.id]
          continue
        }

        remainingFee -= expensive.price
        profitSkins.push(expensive)
        delete availableSkins[expensive.id]
      }

      winnerSkins.push(..._.values(availableSkins))

      const profit = profitSkins.reduce((t, i) => t + i.price, 0)

      yield CoinflipGames.get(game.id).update({
        profitSkins,
        fee,
        winnerSkins,

        state: stateOver,
        rewardSent: false,
        profitSent: false,
        overAt: new Date()
      })

      yield addStats({
        counters: {
          totalTokensPlayed: game.reward,
          totalProfit: profit,

          totalCoinflipPlayed: 1,
          totalCoinflipTokensPlayed: game.reward,
          totalCoinflipProfit: profit
        }
      })
    } else if(game.state === stateJoined) {
      const { replaced } = yield CoinflipGames.get(game.id).update({
        state: stateFlipping,
        endsAt: new Date(Date.now() + 4500)
      })

      if(replaced <= 0) {
        return
      }

      const creatorRaffleTickets = parseInt(game.creator.wager / config.raffle.ratio) * getPlayerRaffleModifier(game.creator.name)
      const againstRaffleTickets = parseInt(game.against.wager / config.raffle.ratio) * getPlayerRaffleModifier(game.creator.name)

      let playerUpdate = yield Player.get(game.creator.id).update({
        raffleTickets: r.row('raffleTickets').default(0).add(creatorRaffleTickets),
        totalTokensPlayed: r.row('totalTokensPlayed').default(0).add(game.creator.wager),
        withdrawRequirement: r.expr([ 0, r.row('withdrawRequirement').default(0).sub(game.creator.wager) ]).max()
      }, { returnChanges: true })

      if(playerUpdate.replaced > 0) {
        sockets.to(game.creator.id).emit('updatePlayer', {
          raffleTickets: playerUpdate.changes[0].new_val.raffleTickets
        })
      }

      playerUpdate = yield Player.get(game.against.id).update({
        raffleTickets: r.row('raffleTickets').default(0).add(againstRaffleTickets),
        totalTokensPlayed: r.row('totalTokensPlayed').default(0).add(game.against.wager),
        withdrawRequirement: r.expr([ 0, r.row('withdrawRequirement').default(0).sub(game.against.wager) ]).max()
      }, { returnChanges: true })

      if(playerUpdate.replaced > 0) {
        sockets.to(game.against.id).emit('updatePlayer', {
          raffleTickets: playerUpdate.changes[0].new_val.raffleTickets
        })
      }
    } else if(game.state === stateJoining) {
      yield CoinflipGames
        .getAll([id, stateJoining], { index: 'idState' })
        .update({
          state: stateWaitingJoin,
          joinExpiration: null,
          against: {
            side: r.row('against')('side')
          },
          joinOfferId: null,
          winner: null,
          winnerSide: null,
          joinTradeOfferUrl: null
        })

        yield cancelOffer(game.joinTradeOfferId, game.against.id)
    } else if(availableStates.indexOf(game.state) >= 0) {
      yield CoinflipGames
        .getAll([id, stateWaitingJoin], { index: 'idState' })
        .update({
          state: stateExpired
        })
    }
  })

  .catch(err => {
    logger.error(`onGameTimer(${id}) ${err.stack || err}`, {
      id
    })
  })
}

function formatGame(game) {
  const formatted = _.pick(game, 'id', 'state', 'createdAt', 'subtotal', 'creator', 'items', 'expiration', 'joinExpiration', 'joinTradeOfferUrl', 'hash', 'flipAt', 'against', 'range')

  if(game.state === stateJoining) {
    formatted.against = _.pick(formatted.against, 'id', 'name', 'avatar', 'side')
  } else if(game.state === stateFlipping || game.state === stateOver) {
    formatted.winner = game.winner
    formatted.winnerSide = game.winnerSide
    formatted.against = game.against
    formatted.creator = game.creator

    if(game.state === stateOver) {
      formatted.percentage = game.percentage
      formatted.secret = game.secret
    }
  }

  return formatted
}

function getCoinflips(req, res) {
  co(function* () {
    const games = yield CoinflipGames
      .getAll(stateWaitingJoin, stateJoined, stateFlipping, stateJoining, { index: 'state' })

    res.json({
      games: games.map(formatGame)
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getCoinflips() ${err}`)
  })
}


function postCoinflipCreate(req, res) {
  const { items, side } = req.body

  if(!items || !is.array(items)) {
    return res.status(400).send('Invalid items')
  }

  const assetIds = _.uniq(items.filter(is.number))
  if(assetIds.length <= 0) {
    return res.status(400).send('Invalid items')
  } else if(assetIds.length > config.games.coinflip.maximumItems) {
    return res.status(400).send(`Max amount of items is ${config.games.coinflip.maximumItems}`)
  }

  if(!is.string(side) || coinflipSides.indexOf(side) < 0) {
    return res.status(400).send('Invalid side')
  }

  if(!req.user.tradeLink) {
   return res.status(400).send('Please set a valid steam trade offer url first')
  }

  co(function* () {
    const v = yield redis.getAsync('csgoboss:skne:blacklisted')
    const blacklistedItems = !!v ? v.split('\n') : []

    const inventory = yield fetchInventory(req.user.id, {
      blacklistedItems
    })

    const depositItems  = inventory.result.items.filter(item => assetIds.indexOf(item.assetId) >= 0)

    // These should equal the same, if they aren't then we were given an item
    // that wasn't in their inventory
    if(assetIds.length !== depositItems.length) {
      return res.status(400).send('Invalid items')
    }

    const subtotal = depositItems.reduce((t, i) => t + i.tokens, 0)
    if(subtotal < config.games.coinflip.minimumWager) {
      return res.status(400).send(`Minimum deposit amount is ${numeral(config.games.coinflip.minimumWager).format('0,00.00')}T`)
    }

    const offerResponse = yield deposit({
      assetIds,

      notifyUrl: config.sknexchange.notifyUrl,
      steamId64: req.user.id,
      tradeLink: req.user.tradeLink,
      depositGroup: 'coinflip',
      includeItems: true,
      forceLockItems: true,

      meta: {
        coinflipSide: side
      }
    })

    if(!!offerResponse.error) {
      return res.status(400).send(offerResponse.error)
    }

    res.json({
      tradeOffer: offerResponse.tradeOffer
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postCoinflipCreate() ${err}`)
  })
}

export function* onCoinflipRewardOfferChange(offer, done) {
  logger.info(`Reward offer (${offer.id}) changed ${offer.state} for ${offer.steamId64}`)

  if(offer.state === 'SENT') {

    sockets.to(offer.steamId64).emit('notify', {
      status: 'success',
      message: `Your trade is now ready. <a target="_blank" href="${offer.tradeOfferUrl}">Click here to view it</a>`,
      timeout: 10000
    })

  } else if(offer.state === 'DECLINED') {
    sockets.to(offer.steamId64).emit('notify', {
      status: 'danger',
      message: (offer.hasError ? offer.error : `Your trade was declined`) + `. No worries, we will try to send your offer again in 5 minutes.`,
    })

    yield CoinflipGames.get(offer.meta.coinflipRewardGameId).update({
      rewardSent: false,
      rewardRetryAt: new Date(Date.now() +  (300 * 1000))
    })
  } else if(offer.state === 'ACCEPTED') {
    yield CoinflipGames.get(offer.meta.coinflipRewardGameId).update({
      rewardAccepted: true,
      rewardAcceptedAt: new Date(),
      tradeOfferId: offer.id
    })
  }

  done()
}

export function* onCoinflipRefundOfferChange(offer, done) {
  if(offer.meta.coinflipJoinRefund) {

    if(offer.state === 'SENT') {
      sockets.to(offer.steamId64).emit('notify', {
        status: 'success',
        message: `Your refund trade is now ready. <a target="_blank" href="${offer.tradeOfferUrl}">Click here to view it</a>`,
        timeout: 10000
      })
    }

    return done()
  }

  if(offer.state === 'DECLINED') {
    yield CoinflipGames.get(offer.meta.coinflipRefundGameId).update({
      refundSent: false,
      retryAt: new Date(Date.now() + 600000)
    })
  }

  done()
}

export function* onCoinflipOfferChange(offer, done) {
  if(!!offer.meta.coinflipGameId) {
    if(offer.state === 'SENT') {
      yield CoinflipGames
          .get(offer.meta.coinflipGameId)
          .update({
            joinTradeOfferUrl: offer.tradeOfferUrl
          })
    } else if(offer.state === 'DECLINED') {
      yield CoinflipGames
          .getAll([offer.meta.coinflipGameId, stateJoining], { index: 'idState' })
          .filter({ joinTradeOfferId: offer.id })
          .update({
            state: stateWaitingJoin,
            joinExpiration: null,
            against: {
              side: r.row('against')('side')
            },
            joinOfferId: null,
            winner: null,
            winnerSide: null,
            joinTradeOfferUrl: null
          })
    } else if(offer.state === 'ACCEPTED') {
      const [ game ] = yield CoinflipGames.getAll([offer.meta.coinflipGameId, stateJoining], { index: 'idState' })
      if(!game || game.joinTradeOfferId !== offer.id) {
        logger.error(`Cannot find coinflip game: ${offer.meta.coinflipGameId}`)

        sockets.to(offer.steamId64).emit('notify', {
          status: 'success',
          message: `Your coinflip game has been refunded.`,
        })

        refundOffer(offer.id, {
          coinflipJoinRefund: true,
          coinflipRefundGameId: offer.meta.coinflipGameId
        }, {
          ignoreSecurity: true
        })

        done()
        return
      }

      const against = yield Player.get(offer.steamId64)
      if(!against) {
        logger.error(`Cannot find against coinflip user: ${offer.steamId64}`)
        done()
        return
      }

      const againstItems = offer.items.map(item => ({
        id: item.assetId,
        icon: item.icon,
        name: item.name,
        price: item.basePrice
      }))

      const gameTotal = game.creator.wager + offer.baseSubtotal
      const creatorPercentage = parseFloat(((game.creator.wager / gameTotal) * 100).toFixed(2))
      const againstPercentage = parseFloat(((offer.baseSubtotal / gameTotal) * 100).toFixed(2))

      const againstInfo = {
        items: againstItems,
        id: offer.steamId64,
        name: against.displayName,
        avatar: against.avatarFull,
        wager: offer.baseSubtotal,
        percentage: againstPercentage
      }

      const tMaxPercentage = game.creator.side === 'T' ? creatorPercentage : againstPercentage
      const winnerSide = game.percentage <= tMaxPercentage ? 'T' : 'CT'
      const winner = game.creator.side === winnerSide ? game.creator : againstInfo

      yield CoinflipGames
        .getAll([ offer.meta.coinflipGameId, stateJoining ], { index: 'idState' })
        .update({
          winner,
          winnerSide,

          state: stateJoined,
          reward: game.subtotal + againstInfo.wager,
          joinedAt: new Date(),
          flipAt: new Date(Date.now() + (10000)),
          joinTradeOfferUrl: null,
          against: r.row('against').merge(againstInfo),
          items: r.row('items').add(againstItems),
          playerIds: r.row('playerIds').append(againstInfo.id),
          creator: r.row('creator').merge({
            percentage: creatorPercentage
          })
        })
    }

    return done()
  }

  if(offer.state === 'ACCEPTED') {
    const creator = yield Player.get(offer.steamId64)
    if(!creator) {
      logger.error(`Cannot find coinflip user: ${offer.steamId64}`)
      done()
      return
    }

    const maxDifference = offer.baseSubtotal * config.games.coinflip.maxDifference

    const creatorItems = offer.items.map(item => ({
      id: item.assetId,
      icon: item.icon,
      name: item.name,
      price: item.basePrice
    }))

    const expiration = new Date(Date.now() + (30 * 60000))
    const rand = random.create()
    const percentage = rand.random() * 100
    const secret = `${percentage}:${rand.string(8)}`
    const hash = crypto.createHash('sha256').update(secret).digest('hex')

    const newGame = {
      maxDifference,
      hash,
      expiration,
      percentage,
      secret,

      subtotal: offer.baseSubtotal,
      state: stateWaitingJoin,
      range: [Math.max(config.games.coinflip.minimumWager, offer.baseSubtotal - maxDifference), offer.baseSubtotal + maxDifference],
      createdAt: new Date(),
      items: creatorItems,
      playerIds: [offer.steamId64],

      creatorId: offer.steamId64,
      creatorTradeOfferId: offer.id,
      creator: {
        side: offer.meta.coinflipSide,
        items: creatorItems,
        id: offer.steamId64,
        name: creator.displayName,
        avatar: creator.avatarFull,
        wager: offer.baseSubtotal
      },

      against: {
        side: offer.meta.coinflipSide === 'T' ? 'CT' : 'T'
      }
    }

    const { generated_keys: [ id ] } = yield CoinflipGames.insert(newGame)
    newGame.id = id
  }

  done()
}

function postCoinflipJoin(req, res) {
  const { items } = req.body
  if(!items || !is.array(items)) {
    return res.status(400).send('Invalid items')
  }

  const assetIds = _.uniq(items.filter(is.number))
  if(assetIds.length <= 0) {
    return res.status(400).send('Invalid items')
  } else if(assetIds.length > config.games.coinflip.maximumItems) {
    return res.status(400).send(`Max amount of items is ${config.games.coinflip.maximumItems}`)
  } else if(!req.user.tradeLink) {
   return res.status(400).send('Please set a valid steam trade offer url first')
  }

  co(function* () {
    const [ game ] = yield CoinflipGames
      .getAll([req.params.id, stateWaitingJoin], { index: 'idState' })
      .filter(r.row('expiration').default(null).eq(null).or(r.row('expiration').gt(r.now())))

    if(!game) {
      return res.status(400).send('The game you were joining does not exist or someone else is already joining')
    }

    const v = yield redis.getAsync('csgoboss:skne:blacklisted')
    const blacklistedItems = !!v ? v.split('\n') : []

    const inventory = yield fetchInventory(req.user.id, {
      blacklistedItems
    })

    const depositItems  = inventory.result.items.filter(item => assetIds.indexOf(item.assetId) >= 0)

    // These should equal the same, if they aren't then we were given an item
    // that wasn't in their inventory
    if(assetIds.length !== depositItems.length) {
      return res.status(400).send('Invalid items')
    }

    const subtotal = depositItems.reduce((t, i) => t + i.baseTokens, 0)
    if(subtotal < game.range[0] || subtotal > game.range[1]) {
      return res.status(400).send('Invalid wager amount')
    }

    if(game.creatorId === req.user.id) {
      // return res.status(400).send('You cannot join your own game')
    }

    const result = yield CoinflipGames
      .getAll([req.params.id, stateWaitingJoin], { index: 'idState' })
      .filter(r.row('expiration').default(null).eq(null).or(r.row('expiration').gt(r.now())))
      .update({
        against: r.row('against').merge({
          id: req.user.id,
          name: req.user.displayName,
          avatar: req.user.avatarFull
        }),

        state: stateJoining,
        joinExpiration: new Date(Date.now() + 90000)
      })

    if(result.replaced < 1) {
      return res.status(400).send('The game you were joining does not exist or someone else is already joining')
    }

    const offerResponse = yield deposit({
      assetIds,

      notifyUrl: config.sknexchange.notifyUrl,
      steamId64: req.user.id,
      tradeLink: req.user.tradeLink,
      depositGroup: 'coinflip',
      includeItems: true,
      forceLockItems: true,

      meta: {
        coinflipGameId: game.id
      }
    })

    if(!!offerResponse.error) {
      return res.status(400).send(offerResponse.error)
    }

    yield CoinflipGames.get(game.id).update({
      joinTradeOfferId: offerResponse.tradeOffer.id
    })

    res.json({
      tradeOffer: offerResponse.tradeOffer
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postCoinflipCreate() ${err}`)
  })
}

function sendExpiredGames() {
  co(function* () {
    const expiredGames = yield CoinflipGames
      .getAll(stateExpired, { index: 'state' })
      .filter(r.row('refundSent').default(false).eq(false).and(r.row('retryAt').default(null).eq(null).or(r.row('retryAt').lt(r.now()))))
      .map(g =>
        g.merge({
          tradeLink: Player.get(g('creatorId'))('tradeLink')
        })
      )

    mapSeries(expiredGames, (game, done) => {
      refundOffer(game.creatorTradeOfferId, {
        coinflipRefundGameId: game.id
      }, {
        ignoreSecurity: true
      })

      .then(result => {
        return CoinflipGames.get(game.id).update({ refundSent: true }).run()
      })

      .then(() => done(), err => {
        logger.error(`sendExpiredGames() ${err}`)
        done()
      })
    }, () => {
      setTimeout(sendExpiredGames, 2500)
    })
  })

  .catch(err => {
    logger.error(`sendExpiredGames() ${err.stack || err}`)
    setTimeout(sendExpiredGames, 1000)
  })
}

function sendRewards() {
  co(function* () {
    const games = yield CoinflipGames
      .getAll([ stateOver, false ], { index: 'stateRewardSent' })
      .filter((r.row('rewardRetryAt').default(null).eq(null).or(r.row('rewardRetryAt').lt(r.now()))))
      .map(g =>
        g.merge({
          tradeLink: Player.get(g('winner')('id'))('tradeLink')
        })
      )

    if(!games.length) {
      return setTimeout(sendRewards, 3500)
    }

    logger.info(`Sending out ${games.length} reward offers`)

    mapSeries(games, (game, done) => {
      if(!game.winnerSkins || game.winnerSkins.length <= 0 || !game.tradeLink) {
        return done()
      }

      const assetIds = _.pluck(game.winnerSkins, 'id')

      withdraw({
        assetIds,

        ignoreBusy: true,
        withdrawGroup: 'coinflip',
        notifyUrl: config.sknexchange.notifyUrl,
        steamId64: game.winner.id,
        tradeLink: game.tradeLink,
        ignoreSecurity: true,

        meta: {
          coinflipRewardGameId: game.id
        }
      })

      .then(response =>
        CoinflipGames.get(game.id).update({ rewardSent: true }).run()
      )

      .then(() => done())

      .catch(err => {
        logger.error(`sendRewards() ${err}`)
        done()
      })
    }, () => {
      setTimeout(sendRewards, 2500)
    })
  })

  .catch(err => {
    logger.error(`sendExpiredGames() ${err.stack || err}`)
    setTimeout(sendExpiredGames, 1000)
  })
}

function getCoinflipHistory(req, res) {
  const { filter } = req.query

  co(function* () {
    let query = CoinflipGames.getAll(stateOver, { index: 'state' })

    if(!!req.user && filter === 'personal') {
      query = CoinflipGames.getAll([ req.user.id, stateOver ], { index: 'playerIdState' })
    }

    const history = yield query
      .orderBy(r.desc('createdAt'))
      .limit(15)
    res.json(history.map(formatGame))
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getCoinflipHistory() ${err}`)
  })
}

export default {
  name: 'coinflip',

  run: function* () {
    const games = yield CoinflipGames.getAll(r.args(availableStates), { index: 'state' })
    logger.info(`Scheduling ${games.length} games`)

    games.forEach(game => scheduleGame(game))

    sendExpiredGames()
    sendRewards()

    const cursor = yield CoinflipGames.changes({
      includeTypes: true
    })

    cursor.each((err, change) => {
      co(function* () {
        const game = change.new_val
        const oldGame = change.old_val

        if(change.type === 'add') {
          scheduleGame(game)
          broadcaseCoinflipStatsThrottled()

          sockets.to(`game:${COINFLIP_GAME}`).emit('newCoinflipGame', formatGame(game))
        } else if(change.type === 'change') {

          if(game.state !== oldGame.state) {
            if(game.state === stateExpired) {
              sockets.to(`game:${COINFLIP_GAME}`).emit('removeCoinflipGame', game.id)
              // broadcaseCoinflipStatsThrottled()
              return
            }

            // if(game.state === stateOver) {
            //   broadcaseCoinflipStatsThrottled()
            // }

            sockets.to(`game:${COINFLIP_GAME}`).emit('updateCoinflipGame', formatGame(game))
            scheduleGame(game)
          }
        }

        broadcaseCoinflipStats()
      })

      .catch(err => {
        logger.error(`coinflup run() ${err.stack || err}`)
      })
    })
  },

  router() {
    const router = Router()
    router.get('/', getCoinflips)
    router.post('/create', ensureGameEnabled(COINFLIP_GAME), postCoinflipCreate)
    router.post('/join/:id', ensureGameEnabled(COINFLIP_GAME), postCoinflipJoin)
    router.get('/history', getCoinflipHistory)
    return router
  }

}

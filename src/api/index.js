
import { Router } from 'express'
import co from 'co'
import is from 'is_js'
import config from 'config'
import numeral from 'numeral'

import ChatHistory from '../document/chatHistory'
import Raffles from '../document/raffles'
import CoinflipGames, { stateWaitingJoin, stateJoined, stateFlipping, stateOver, stateJoining, stateExpired, stateUnlisted } from '../document/coinflip'

import Player, { givePlayerBalance, takePlayerBalance } from '../document/player'
import * as chat from '../lib/chat'
import logger from '../lib/logger'
import { tokensAmount } from '../lib/tokens'
import r from '../lib/database'
import sockets, { getOnlineCount } from '../lib/sockets'
import redis from '../lib/redis'
import { ensureStaff, ensureAuthenticated } from '../lib/middleware'

import auth from './auth'
import admin from './admin'
import game from './game'
import affiliate from './affiliate'
import freeTokens from './freeTokens'
import raffles from './raffles'
import jukebox from './jukebox'

import { getMarketplace, postMarketplacePurchase } from './marketplace'
import { getInventory, postInventoryDeposit } from './inventory'

function getSession(req, res) {
  if(!!req.query.admin && (!req.user || (!req.user.admin && !req.user.silentAdmin))) {
    return res.status(400).send('Invalid access')
  }

  co(function* () {
    const colors = yield redis.getAsync('game:colors:statistic')
    const jackpot3 = yield redis.getAsync('game:jackpot3:statistic')
    const jackpot5 = yield redis.getAsync('game:jackpot5:statistic')

    const raffles = yield Raffles
      .getAll('ACTIVE', { index: 'state' })
      .pluck('id', 'createdAt', 'endDate', 'state', 'tokenPrize', 'totalTickets', {
        entries: !!req.user ? [req.user.id] : []
      })
      .orderBy(r.desc('createdAt'))

    const coinflip = yield CoinflipGames
      .getAll(stateWaitingJoin, stateJoined, stateJoining, stateFlipping, { index: 'state' })
      .sum('subtotal')

    const session = {
      raffles,
      serverTime: new Date(),

      server: {
        online: yield getOnlineCount(),
        currentUpdate: null,
        version: 'DEV',
        chatChannels: chat.channels,
      },

      statistics: {
        colors: parseFloat(colors || 0),
        jackpot3: parseFloat(jackpot3 || 0),
        jackpot5: parseFloat(jackpot5 || 0),
        coinflip: parseFloat(coinflip || 0),
        coinFlip: 0
      }
    }

    if(!!req.user) {
      const { id, tradeLink, displayName, avatarFull, balance, raffleTickets,
        mod, admin } = req.user

      session.user = {
        id,
        tradeLink,
        tokens: balance,
        raffleTickets,

        name: displayName,
        avatar: avatarFull,
        steamId: id
      }

      if(admin) {
        session.user.admin = true
      } else if(mod) {
        session.user.mod = true
      }
    }

    res.json(session)
  })

  .catch(console.log)
}

function getChatHistory(req, res) {
  let { channel } = req.query

  if(!is.string(channel) || chat.channels.indexOf(channel) < 0) {
    channel = chat.channels[0]
  }

  co(function* () {
    // const cached = yield redis.getAsync(`chat:${channel}`)
    // if(cached) {
    //   res.json(JSON.parse(cached))
    //   return
    // }
    //
    // const ts = Math.round(new Date().getTime() / 1000) - (1800)

    // const history = yield ChatHistory
    //   .between([ channel, ts], [ channel, r.maxval ], { index: 'chatChannelCreatedAt' })
    //   .orderBy(r.desc('createdAt'))
    //   .limit(40)
    //   .run()

    res.json([])

    // yield redis.setAsync(`chat:${channel}`, JSON.stringify(history))
    // yield redis.expireAsync(`chat:${channel}`, 5)
  })

  .catch(err =>
    logger.error(`getChatHistory() ${err}`)
  )
}

function postUpdateSettings(req, res) {
  co(function* () {
    const { tradeLink } = req.body
    const update = {}

    if(!!tradeLink || !is.string(tradeLink)) {
      update.tradeLink = tradeLink
    }

    if(Object.keys(update).length > 0) {
      yield Player.get(req.user.id).update(update).run()
    }

    res.json({
      success: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postUpdateSettings() ${err.stack || err}`)
  })
}

function postSend(req, res) {
  const { to, amount } = req.body

  if(!is.string(to) || !is.number(amount) || amount <= 0) {
    return res.status(400).send('Invalid request')
  }

  if(to === req.user.id) {
    return res.status(400).send('You cannot send tokens to yourself')
  }

  co(function* () {
    if(!req.user.totalTokensPlayed || req.user.totalTokensPlayed < tokensAmount(20)) {
      return res.status(400).send('You need to play at least 20T before being able to tip')
    }

    const other = yield Player.get(to)
    if(!other) {
      return res.status(400).send('Cannot find other player')
    }

    const { replaced, changes } = yield takePlayerBalance(req.user.id, amount, {
      meta: {
        description: 'Send',
        steamId: to
      }
    })

    if(replaced <= 0) {
      return res.status(400).send('You don\'t have enough tokens')
    }

    yield givePlayerBalance(to, amount, {
      meta: {
        description: 'Send: Transfer from',
        steamId: req.user.id
      }
    })

    sockets.to(to).emit('chatMessage', {
      name: 'You\'ve got money!',
      message: `${req.user.displayName} has sent you ${numeral(amount).format('0,0.00')}T!`,
      steamId: to,
      avatar: req.user.avatarFull,

      styles: {
        container: {
          background: '#374179'
        },

        message: {
          fontWeight: 900
        }
      }
    })

    res.json({
      sent: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postSend() ${err.stack || err}`)
  })
}

function getPlayerStats(req, res) {
  co(function* () {
    const player = yield Player.get(req.params.id)
    if(!player) {
      return res.status(400).send(`Cannot find player`)
    }

    res.json({
      steamId: player.id,
      name: player.displayName,
      totalTokensPlayed: player.totalTokensPlayed || 0,
      totalTokensProfit: player.totalTokensProfit || 0,
    })
  })

  .catch(err => {
    logger.error(`getPlayerStats() ${err}`)
    res.status(400).send(`Please try again later`)
  })
}

function postUpdateSettings(req, res) {
  co(function* () {
    const { tradeLink } = req.body
    const update = {}

    if(!!tradeLink || !is.string(tradeLink)) {
      update.tradeLink = tradeLink
    }

    if(Object.keys(update).length > 0) {
      yield Player.get(req.user.id).update(update).run()
    }

    res.json({
      success: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postUpdateSettings() ${err.stack || err}`)
  })
}

function postSend(req, res) {
  const { to, amount } = req.body

  if(!is.string(to) || !is.number(amount) || amount <= 0) {
    return res.status(400).send('Invalid request')
  }

  if(to === req.user.id) {
    return res.status(400).send('You cannot send tokens to yourself')
  }

  co(function* () {
    if(!req.user.totalTokensPlayed || req.user.totalTokensPlayed < tokensAmount(20)) {
      return res.status(400).send('You need to play at least 20T before being able to tip')
    }

    const other = yield Player.get(to)
    if(!other) {
      return res.status(400).send('Cannot find other player')
    }

    const { replaced, changes } = yield takePlayerBalance(req.user.id, amount, {
      meta: {
        description: 'Send',
        steamId: to
      }
    })

    if(replaced <= 0) {
      return res.status(400).send('You don\'t have enough tokens')
    }

    yield givePlayerBalance(to, amount, {
      meta: {
        description: 'Send: Transfer from',
        steamId: req.user.id
      }
    })

    sockets.to(to).emit('chatMessage', {
      name: 'You\'ve got money!',
      message: `${req.user.displayName} has sent you ${numeral(amount).format('0,0.00')}T!`,
      steamId: to,
      avatar: req.user.avatarFull,

      styles: {
        container: {
          background: '#374179'
        },

        message: {
          fontWeight: 900
        }
      }
    })

    res.json({
      sent: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postSend() ${err.stack || err}`)
  })
}

export default () => {
  const router = Router()

  router.all('*', function(req, res,next) {
      let origin = req.headers.origin
      if(origin !== 'http://www.csgoboss.com') {
        origin = config.url
      }

      /**
       * Response settings
       * @type {Object}
       */
      var responseSettings = {
          "AccessControlAllowOrigin": origin,
          "AccessControlAllowHeaders": "Content-Type,X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name, Cookie",
          "AccessControlAllowMethods": "POST, GET, PUT, DELETE, OPTIONS",
          "AccessControlAllowCredentials": true
      };

      /**
       * Headers
       */
      res.header("Access-Control-Allow-Credentials", responseSettings.AccessControlAllowCredentials);
      res.header("Access-Control-Allow-Origin",  responseSettings.AccessControlAllowOrigin);
      res.header("Access-Control-Allow-Headers", (req.headers['access-control-request-headers']) ? req.headers['access-control-request-headers'] : "x-requested-with");
      res.header("Access-Control-Allow-Methods", (req.headers['access-control-request-method']) ? req.headers['access-control-request-method'] : responseSettings.AccessControlAllowMethods);

      if ('OPTIONS' == req.method) {
        res.end()
      }
      else {
          next();
      }


  });

  router.get('/stats/:id', getPlayerStats)
  router.post('/user/send', ensureAuthenticated, postSend)
  router.post('/updateSettings', ensureAuthenticated, postUpdateSettings)

  router.get('/session', getSession)
  router.get('/chatHistory', getChatHistory)

  router.get('/marketplace', getMarketplace)
  router.post('/marketplace/purchase', ensureAuthenticated, postMarketplacePurchase)

  router.get('/inventory', ensureAuthenticated, getInventory)
  router.post('/inventory/deposit', ensureAuthenticated, postInventoryDeposit)

  router.use('/auth', auth())
  router.use('/g', game())
  router.use('/raffles', raffles())
  router.use('/jukebox', jukebox())

  router.use('/admin', ensureStaff, admin())
  router.use('/affiliate', ensureAuthenticated, affiliate())
  router.use('/free-tokens', ensureAuthenticated, freeTokens())
  return router
}

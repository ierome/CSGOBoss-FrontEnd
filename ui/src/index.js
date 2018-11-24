
import 'babel-polyfill'

import co from 'co'
import cors from 'cors'
import config from 'config'
import express from 'express'
import bodyParser from 'body-parser'
import passport from 'passport'
import session from 'express-session'
import morgan from 'morgan'
import http from 'http'
import requestIp from 'request-ip'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import _ from 'underscore'
import jayson from 'jayson'
import numeral from 'numeral'

import connectRedis from 'connect-redis'
const RedisStore = connectRedis(session)

import api from './api'
import sockets from './lib/sockets'
import Players, { PlayerBalanceHistory } from './document/player'
import Campaigns, { logCampaignActivity } from './document/campaign'
import { migrateDocuments } from './document'
import r from './lib/database'
import logger from './lib/logger'
import { addStats } from './document/stats'
import { onCoinflipOfferChange, onCoinflipRefundOfferChange, onCoinflipRewardOfferChange } from './games/coinflip'

import './lib/passport'

const rpcServer = jayson.server({
  'trade.OnTradeOfferStateChange': (offer, done) => {
    co(function* () {
      if(offer.type === 'WITHDRAW' && offer.withdrawGroup === 'coinflip') {
        if(!!offer.meta.coinflipRefundGameId) {
          yield co(onCoinflipRefundOfferChange, offer, done)
          return
        } else if(!!offer.meta.coinflipRewardGameId) {
          yield co(onCoinflipRewardOfferChange, offer, done)
          return
        }

        done()
        return
      }

      if(offer.type === 'DEPOSIT') {
        sockets.to(offer.steamId64).emit('tradeOfferChanged', offer)

        if(offer.depositGroup === 'coinflip') {
          yield co(onCoinflipOfferChange, offer, done)
          return
        }

        if(offer.state === 'ACCEPTED') {
          const { baseSubtotal:subtotal } = offer

          yield addStats({
            counters: {
              totalDeposits: 1,
              totalDeposited: subtotal
            }
          })

          const { replaced, changes } = yield Players
            .get(offer.steamId64)
            .update(r.branch(r.row('acceptedDeposits').default([]).contains(offer.id).not(), {
              hasDeposited: true,
              balance: r.row('balance').add(subtotal),
              acceptedDeposits: r.row('acceptedDeposits').default([]).append(offer.id),
              totalDeposits: r.row('totalDeposit').default(0).add(subtotal),
              withdrawRequirement: r.row("withdrawRequirement").default(0).add(subtotal * 0.6),
              dailyTokensRequirement: r.expr([ r.row('dailyTokensRequirement').default(0).sub(subtotal), 0 ]).max()
            }, { }), {
              returnChanges: true
            })

          if(replaced > 0) {

            yield PlayerBalanceHistory.insert({
              meta: {
                name: 'Deposit',
                itemNames: offer.itemNames,
                offerId: offer.id
              },

              amount: subtotal,
              createdAt: new Date(),
              playerId: offer.steamId64,
            })

            sockets.to(offer.steamId64).emit('updatePlayer', {
              balance: changes[0].new_val.balance
            })

            const change = changes[0].new_val

            if(change.hasRedeemed) {
              const [ campaign ] = yield Campaigns.getAll(change.redeemedCode, { index: 'code' })

              if(!!campaign && campaign.linkedTo !== change.id) {
                if(!!campaign) {
                  const commission = subtotal * campaign.depositComission

                  yield Campaigns.get(campaign.id).update({
                    balance: r.row('balance').add(commission),
                    statTotalDeposited: r.row('statTotalDeposited').default(0).add(subtotal),
                    statTotalDeposits: r.row('statTotalDeposits').default(0).add(1),
                  })

                  yield logCampaignActivity(campaign.id, commission, `${change.displayName} deposited ${numeral(commission).format('0,0.00')}T`, {
                    steamId: change.id
                  })
                }
              }
            }
          }
        }
      }

      if(offer.type === 'WITHDRAW') {
        sockets.to(offer.steamId64).emit('tradeOfferChanged', offer)

        if(offer.state === 'ACCEPTED') {
          yield addStats({
            counters: {
              totalWithdraws: 1,
              totalWithdrawn: offer.subtotal
            }
          })
        }

        if (offer.state === 'DECLINED' && offer.retryCount === offer.maxRetries) {

          const { replaced, changes } = yield Players
            .get(offer.steamId64)
            .update({
              balance: r.row('balance').add(offer.subtotal)
            }, {
              returnChanges: true
            })


            if(replaced > 0) {
              yield PlayerBalanceHistory.insert({
                meta: {
                  name: 'Market refund',
                  offerId: offer.id
                },

                amount: offer.subtotal,
                createdAt: new Date(),
                playerId: offer.steamId64,
              })

              sockets.to(offer.steamId64).emit('updatePlayer', {
                balance: changes[0].new_val.balance
              })
            }
        }
      }

      done()
    })

    .catch(err => {
      logger.error(`trade.OnTradeOfferStateChange() ${err.stack || err}`, {
        offerId: offer.id,
        state: offer.state
      })

      // done()
    })
  }
}).middleware()

function* watchPlayersDocument() {
  const newVal  = r.row('new_val')
  const oldVal  = r.row('old_val')

  const cursor = yield Players.changes({
    squash: true,
    includeTypes: true
  }).filter(
    r.row('type').eq('change').and(
      newVal('muteExpiration').default(null).ne(oldVal('muteExpiration').default(null))
        .or(newVal('admin').default(null).ne(oldVal('admin').default(null)))
        .or(newVal('mod').default(null).ne(oldVal('mod').default(null)))
        .or(newVal('totalTokensPlayed').default(null).ne(oldVal('totalTokensPlayed').default(null)))
    )
  )

  cursor.each((err, change) => {
    if(!!err) {
      logger.error(`watchPlayersDocument() ${err}`)
      return
    }

    if(change.type === 'change') {
      const room = sockets.sockets.adapter.rooms[change.new_val.id]
      if(!room) {
        return
      }

      _.map(room.sockets, (_, id) =>
        sockets.sockets.sockets[id]._player = {
          ...sockets.sockets.sockets[id]._player,
          ...change.new_val
        }
      )

      // Update clients
      //
      // const updateOn = ['balance', 'raffleTickets']
      // const modified = updateOn.filter(k => change.new_val[k] !== change.old_val[k])
      //
      // if(modified.length > 0) {
      //   const update = _
      //     .chain(modified)
      //     .map(k => {
      //
      //       // Legacy
      //       if(k === 'balance') {
      //         return [ 'tokens', change.new_val[k] ]
      //       }
      //
      //       return [ k, change.new_val[k] ]
      //     })
      //     .object()
      //     .value()
      //
      //   sockets.to(change.new_val.id).emit('updatePlayer', update)
      // }
    }
  })
}

co(function* () {
  logger.info('CSGOBOSS API')

  // Migrate

  yield migrateDocuments()

  // Watch documents

  yield co(watchPlayersDocument)

  // Express

  const app     = express()
  const server  = new http.Server(app)

  if(config.morgan) {
    app.use(morgan('tiny'))
  }

  const sessionMiddleware = session({
    secret: config.secret,
    store: new RedisStore(config.redis),
    name: 'bs',
    resave: true,
    saveUninitialized: true
  })

  // Enable cors
  // app.use(cors({
  //   origin: [ config.url, config.authUrl
  // }))

  app.use(cookieParser())
  app.use(sessionMiddleware)
  app.use(requestIp.mw())

  // Passport
  app.use(passport.initialize())
  app.use(passport.session())

  // Compression
  app.use(compression())

  // Body parser
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.post('/rpc', (req, res, next) => {
    const { whitelist } = config.sknexchange
    const ip = requestIp.getClientIp(req)

    if(whitelist.indexOf(ip) < 0) {
      return res.json({ error: 'No access' })
    }

    next()
  }, rpcServer)

  // API
  app.use('/api', api())

  // Error handling
  app.use((err, req, res, next) => {
    if(err) {
      logger.error(err)

      if(req.xhr) {
        return res.json({ error: 'Please try again later' })
      }

      res.send('Please try again later')
      return
    }

    next()
  })

  // Socket.IO
  sockets.use((socket, next) => sessionMiddleware(socket.request, {}, next))
  sockets.use((socket, next) => passport.initialize()(socket.request, {}, next))
  sockets.use((socket, next) => passport.session()(socket.request, {}, next))
  sockets.listen(server)

  const { httpPort } = config
  server.listen(httpPort, () => {
    logger.info(`HTTP started on port ${httpPort}`)

    process.on('uncaughtException', err => {
      logger.error(`Uncaught exception: ${err.stack || err}`)
    })
  })
})

.catch(err => {
  logger.error(`startup error: ${err}`)
})

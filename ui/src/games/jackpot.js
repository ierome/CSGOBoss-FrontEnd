
import { Router } from 'express'
import co from 'co'
import config from 'config'
import is from 'is_js'
import random from 'random-seed'
import crypto from 'crypto'
import _ from 'underscore'
import schedule from 'node-schedule'
import numeral from 'numeral'

import JackpotGames, { getCurrentJackpotGame, jackpotStateActive, jackpotStageNotStarted, jackpotStageInProgress, jackpotStageOver, jackpotStageStarting } from '../document/jackpot'
import { JACKPOT_GAME, SMALL_JACKPOT_GAME, isGameDisabled } from '../games'
import Player, { PlayerBalanceHistory, takePlayerBalance, givePlayerBalance, getPlayerRaffleModifier } from '../document/player'
import { tokensAmount } from '../lib/tokens'
import logger from '../lib/logger'
import redis from '../lib/redis'
import sockets from '../lib/sockets'
import r from '../lib/database'
import { ensureAuthenticated } from '../lib/middleware'
import { addStats } from '../document/stats'

const entryColors = [
  '#f4d58d', '#5e735f', '#009688', '#f44336', '#f44336',
  '#e91e63', '#9e9e9e', '#cddc39', '#e53935', '#ffc107',
  '#3f51b5', '#626fb5', '#6ab513', '#222429', '#289a90',
  '#2196f3', '#673ab7', '#bdb08f', '#795548', '#5072c3'
]

const modes = {
  [JACKPOT_GAME]: {
    id: JACKPOT_GAME,
    name: 'Classic Jackpot',
    minimumBet: tokensAmount(1),
    roundLength: 35000
  },

  [SMALL_JACKPOT_GAME]: {
    id: SMALL_JACKPOT_GAME,
    name: 'Small Jackpot',
    minimumBet: tokensAmount(0.10),
    maximumBet: 3,
    maximumBets: 3,
    roundLength: 35000
  }
}

const jackpotTimers = {}

function finishGame(game) {
  logger.info(`Finishing jackpot (${game.id}) with pot ${game.potSize} and ${game.entries.length} entries`)

  co(function* () {
    const winningTicket = Math.floor(game.roundNumber * game.ticketSize)
    const entry = game.entries.reduce((winner, entry) => entry.ticketStart <= winningTicket && entry.ticketEnd >= winningTicket ? entry : winner, game.entries)
    if(!entry) {
      throw new Error('could not find winning entry')
    }

    const entries = game.entries.filter(e => e.id === entry.id)
    const totalDeposited = entries.reduce((s, e) => s + e.tokens, 0)
    const chance = (totalDeposited / game.potSize) * 100

    const winnerPot = game.potSize - totalDeposited
    const fee = winnerPot * 0.10
    const reward = totalDeposited + (winnerPot - fee)

    logger.info(`${entry.name} won ${reward} from ${totalDeposited} with a ${chance} chance. ${fee} Fee.`)

    const nextGameAt = new Date(Date.now() + 16000)

    const update = {
      reward,
      fee,
      nextGameAt,

      stage: jackpotStageInProgress,
      winner: {
        chance,

        id: entry.id,
        name: entry.name,
        avatar: entry.avatar,
        ticket: winningTicket
      }
    }

    yield JackpotGames.get(game.id).update(update)

    game.stage = jackpotStageInProgress
    game.nextGameAt = nextGameAt
    scheduleGame(game)
  })

  .catch(err =>
    logger.error(`finishGame() ${err.stack || err}`, {
      id: game.id,
      gameType: game.gameType
    })
  )
}

function onJackpotTimer(gameType) {
  co(function* () {
    const active = yield getCurrentJackpotGame(gameType)
    if(!active) {
      throw new Error('could not find active jackpot')
    }

    if(active.stage === jackpotStageStarting) {
      finishGame(active)
    } else if(active.stage === jackpotStageInProgress) {
      logger.info(`Finishing jackpot ${active.id} (${active.gameType})`)

      const { replaced, changes } = yield JackpotGames.get(active.id).update({
        rewardSent: true
      })

      if(replaced > 0) {
        const players = _.groupBy(active.entries, 'id')

        for(let id in players) {
          let entries = players[id]

          let totalTokensPlayed = entries.reduce((t, e) => t + e.tokens, 0)
          let totalTokensWon = active.winner.id === id ? active.reward : 0
          let totalProfit = totalTokensWon - totalTokensPlayed

          let raffleTickets = parseInt(totalTokensPlayed / config.raffle.ratio) * getPlayerRaffleModifier(entries[0].name)

          let result = yield Player.get(id).update({
            balance: totalTokensWon > 0 ? r.row('balance').add(totalTokensWon) : r.row('balance'),
            raffleTickets: r.row('raffleTickets').default(0).add(raffleTickets),
            withdrawRequirement: r.expr([ 0, r.row('withdrawRequirement').default(0).sub(totalTokensPlayed) ]).max(),
            totalTokensPlayed: r.row('totalTokensPlayed').default(0).add(totalTokensPlayed),
            totalTokensProfit: totalProfit > 0 ? r.row('totalTokensProfit').default(0).add(totalProfit) : r.row('totalTokensProfit').default(0),
          }, { returnChanges: true })

          if(result.replaced > 0) {

            if(totalTokensWon > 0) {
              yield PlayerBalanceHistory.insert({
                meta: {
                  name: 'Jackpot: Win',
                  gameId: active.id
                },

                amount: totalTokensWon,
                createdAt: new Date(),
                playerId: id,
              })
            }

            sockets.to(id).emit('updatePlayer', {
              balance: result.changes[0].new_val.balance,
              raffleTickets: result.changes[0].new_val.raffleTickets
            })
          }
        }

        yield addStats({
          counters: {
            totalProfit: active.fee,
            totalTokensPlayed: active.potSize,
            totalTokensWon: active.reward,

            totalJackpotProfit: active.fee,
            totalJackpotPlayed: 1,
            totalJackpotTokensPlayed: active.potSize,
            totalJackpotTokensWon: active.reward,
            totalJackpotBets: active.entries.length,

            [`totalJackpot${active.gameType}Profit`]: active.fee,
            [`totalJackpot${active.gameType}Played`]: 1,
            [`totalJackpot${active.gameType}TokensPlayed`]: active.potSize,
            [`totalJackpot${active.gameType}TokensWon`]: active.reward,
            [`totalJackpot${active.gameType}Bets`]: active.entries.length,
          }
        })
      }

      yield JackpotGames.get(active.id).update({
        state: jackpotStageOver
      })

      logger.info(`Starting new ${active.gameType} jackpot...`)
      yield createJackpotGame(active.gameType)
    }
  })

  .catch(err =>
    logger.error(`onJackpotTimer() ${err.stack || err}`, {
      gameType
    })
  )
}

function scheduleGame(game) {
  if(game.stage === jackpotStageNotStarted) {
    return
  }

  if(typeof jackpotTimers[game.gameType] !== 'undefined') {
    jackpotTimers[game.gameType].cancel()
  }

  const endsAt = game.stage === jackpotStageStarting ? game.endsAt : game.nextGameAt

  if(endsAt <= new Date()) {
    onJackpotTimer(game.gameType)
    return
  }

  jackpotTimers[game.gameType] = schedule.scheduleJob(endsAt, () => onJackpotTimer(game.gameType))
}

function createJackpotGame(id) {
  return co(function* () {
    const ran = random.create()
    const roundNumber = ran.random()

    const secret = `${roundNumber}`
    const hash = crypto.createHash('sha256').update(secret).digest('hex')

    const mode = modes[id]

    const minimumBet = mode.minimumBet || tokensAmount(0.10)
    const maximumBet = mode.maximumBet || null
    const maximumBets = mode.maximumBets || null

    const newGame = {
      roundNumber,
      hash,
      secret,
      minimumBet,
      maximumBet,
      maximumBets,

      createdAt: new Date(),
      state: jackpotStateActive,
      stage: jackpotStageNotStarted,
      gameType: id,
      roundLength: mode.roundLength,

      entries: [],
      potSize: 0,
      ticketSize: 0
    }

    const { generated_keys } = yield JackpotGames.insert(newGame)

    return {
      ...newGame,
      id: generated_keys[0]
    }
  })
}

function formatJackpotGame(game) {
  const fields = ['id', 'mode', 'endsAt', 'hash', 'potSize', 'entries', 'roundLength', 'stage', 'minimumBet', 'maximumBet']

  if(game.stage === jackpotStageInProgress || game.state === jackpotStageOver) {
    console.log('test')
    fields.push(...['nextGameAt', 'secret', 'roundNumber', 'winner'])
  }

  return _.pick(game, ...fields)
}

function getJackpotGame(req, res) {
  const modeId = parseInt(req.params.mode)

  if(typeof modes[modeId] === 'undefined') {
    return res.status(400).send('Unknown jackpot mode')
  }

  const mode = modes[modeId]

  co(function* () {
    const active = yield getCurrentJackpotGame(modeId)

    res.json({
      settings: {
        ...mode,
        jackpotSnipeUnder: 3000
      },
      active: !!active ? formatJackpotGame(active) : null
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getJackpotGame() ${err.stack || err}`, {
      mode
    })
  })
}

function postJackpotIncrease(req, res) {
  const { amount } = req.body

  if(!is.number(amount) || amount <= 0) {
    return res.status(400).send('Invalid bet amount')
  }

  const modeId = parseInt(req.params.mode)

  if(typeof modes[modeId] === 'undefined') {
    return res.status(400).send('Unknown jackpot mode')
  }

  const mode = modes[modeId]

  co(function* () {
    const disabled = yield isGameDisabled(modeId)
    if(disabled) {
      return res.status(400).send('This game is currently disabled, check back soon')
    }

    const active = yield getCurrentJackpotGame(modeId)
    if(!active) {
      return res.status(400).send('Could not find active jackpot game')
    } else if(active.stage === jackpotStageInProgress || active.stage === jackpotStageOver || (!!active.endsAt && active.endsAt < new Date())) {
      return res.status(400).send('Jackpot has already started, please wait for it to finish')
    }

    if(!!active.maximumBets && active.maximumBets > 0) {
      const count = _.where(active.entries, { id: req.user.id }).length

      if(count >= active.maximumBets) {
        return res.status(400).send('The maximum times you can place a bet is ' + active.maximumBets)
      }
    } else if(!!active.minimumBet && amount < active.minimumBet) {
      return res.status(400).send(`The minimum bet is ${numeral(active.minimumBet).format('0,0.00')}T`)
    } else if(!!active.maximumBet && amount > active.maximumBet) {
      return res.status(400).send(`The maximum bet is ${numeral(active.maximumBet).format('0,0.00')}T`)
    }

    const { replaced } = yield takePlayerBalance(req.user.id, amount, {
      meta: {
        mode: modeId,
        description: 'Jackpot: Bet',
        gameId: active.id
      }
    })

    if(replaced !== 1) {
      return res.status(400).send('You don\'t have enough tokens')
    }

    const sniped = active.stage == jackpotStageStarting && Date.now() >= (active.endsAt.getTime() - 3000)

    const checkState = r.row('stage').ne(jackpotStageOver).and(r.row('stage').ne(jackpotStageInProgress))
      .and(r.row('endsAt').default(null).eq(null).or(r.row('endsAt').gt(new Date())))

    const checkBetRange = r.row('minimumBet').gt(0).and(r.expr(amount).lt(r.row('minimumBet')))
      .or(r.row('maximumBet').gt(0).and(r.expr(amount).gt(r.row('maximumBet'))))

    const newEntry = {
      sniped,

    	createdAt: new Date(),
  		id: req.user.id,
  		name: req.user.displayName,
  		avatar: req.user.avatarFull,
  		steamId: req.user.id,
  		tokens: amount,
  		ticketStart: r.expr(r.row('ticketSize')).add(1),
  		ticketEnd: r.expr(r.row('ticketSize')).add(amount * 100),
  		color: entryColors[Math.floor(Math.random() * entryColors.length)]
    }

    const update = {
      potSize: r.row('potSize').add(amount),
      ticketSize: r.row('ticketSize').add(amount * 100),
      entries: r.row('entries').prepend(newEntry)
    }

    const branchArgs = [
      checkState.not(), r.error('Invalid error'),
      checkBetRange, r.error('Invalid bet range'),
      update
    ]

    const insertResult = yield JackpotGames.get(active.id).update(r.branch(...branchArgs))
    if(insertResult.replaced <= 0) {
      yield givePlayerBalance(req.user.id, amount, {
        meta: {
          mode: modeId,
          description: 'Jackpot: Bet Refund',
          gameId: active.id
        }
      })

      return res.status(400).send(insertResult.first_error || 'Please try again later')
    }



    res.json({
      success: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postJackpotIncrease() ${err.stack || err}`, {
      amount,
      mode
    })
  })
}

export default {
  name: 'jackpot',

  run: function* () {
    for(let id in modes) {
      let mode = modes[id]

      let game = yield getCurrentJackpotGame(mode.id)

      if(!game) {
        game = yield createJackpotGame(mode.id)
      }

      scheduleGame(game)
    }

    const cursor = yield JackpotGames.changes({
      includeTypes: true
    })

    cursor.each((err, change) => {
      co(function* () {
        const game = change.new_val
        const oldGame = change.old_val

        if(change.type === 'add') {
          sockets.to(`game:${game.gameType}`).emit('jackpotNew', formatJackpotGame(game))
          scheduleGame(game)

          redis.set(`game:jackpot${game.gameType}:statistic`, 0)
          sockets.emit('gameStatistic', {
            [`jackpot${game.gameType}`]: 0
          })
        } else if(change.type === 'change') {
          let update = {
            potSize: game.potSize,
            startedAt: game.startedAt,
            endsAt: game.endsAt,
            stage: game.stage
          }

          if(game.entries.length !== oldGame.entries.length) {
            update.entries = game.entries.slice(0, game.entries.length - oldGame.entries.length)

            redis.set(`game:jackpot${game.gameType}:statistic`, game.potSize)
            sockets.emit('gameStatistic', {
              [`jackpot${game.gameType}`]: game.potSize
            })
          }

          // Start the game
          if(change.stage !== jackpotStageNotStarted) {
            const uniquePlayers = _.uniq(game.entries, e => e.id).length

            if(uniquePlayers >= 2) {
              const now = new Date()
              const endsAt = new Date(now.getTime() + game.roundLength)

              const newChange = {
                endsAt,

                stage: jackpotStageStarting,
                startsAt: now
              }

              const result = yield JackpotGames.get(game.id).update(r.branch(r.row('stage').eq(jackpotStageNotStarted), newChange, {}))

              if(result.replaced > 0) {
                logger.info(`Jackpot (${game.gameType}) is now starting with ${game.potSize}`)
                update = {
                  ...update,
                  ...newChange
                }
              }
            }
          }

          if(game.stage === jackpotStageInProgress || game.state === jackpotStageOver) {
            update = {
              ...update,
              ..._.pick(game, 'nextGameAt', 'secret', 'roundNumber', 'winner')
            }
          }

          if(game.stage !== oldGame.stage) {
            scheduleGame(game)
          }

          if(game.state !== jackpotStageOver) {
            sockets.to(`game:${game.gameType}`).emit('jackpotChanged', update)
          }
        }
      })

      .catch(err => {
        logger.error(`run() ${err.stack || err}`)
      })
    })
  },

  router() {
    const router = Router()
    router.post('/:mode/increase', ensureAuthenticated, postJackpotIncrease)
    router.get('/:mode', getJackpotGame)
    return router
  }

}

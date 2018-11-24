
import { Router } from 'express'
import co from 'co'
import config from 'config'
import is from 'is_js'
import _ from 'underscore'
import random from 'random-seed'
import crypto from 'crypto'
import schedule from 'node-schedule'

import { ensureAuthenticated, ensureGameEnabled } from '../lib/middleware'
import { COLORS_GAME } from '../games'

import { tokensAmount } from '../lib/tokens'
import r from '../lib/database'
import logger from '../lib/logger'
import redis from '../lib/redis'
import sockets from '../lib/sockets'
import Player, { PlayerBalanceHistory, takePlayerBalance, givePlayerBalance, getPlayerRaffleModifier } from '../document/player'
import ColorsGames, { colorsStateActive, colorsStateOver, getCurrentColorsGame } from '../document/colors'
import { addStats, addPlayerStats } from '../document/stats'

const segmentColors = config.games.colors.segments.map(team =>
  config.games.colors.teams[team].color
)

const teamsArray = _.map(config.games.colors.teams, v => v)

let currentGameJob = null

function createColorsGame() {
  return co(function* () {
    const rand = random.create()
    const roundNumber = rand(segmentColors.length)
    const segment = config.games.colors.segments[roundNumber]
    const team = config.games.colors.teams[segment]

    const secret = `${roundNumber}-${segment}-${rand.string(12)}`
    const hash = crypto.createHash('sha256').update(secret).digest('hex')

    const now = new Date()
    const newGame = {
      roundNumber,
      secret,
      hash,

      state: colorsStateActive,
      createdAt: now,
      endsAt: new Date(now.getTime() + config.games.colors.roundLength),
      roundLength: config.games.colors.roundLength,
      team: segment,
      multiplier: team.mult,
      color: team.color,

      pot: 0,
      entries: []
    }

    const { generated_keys } = yield ColorsGames.insert(newGame)

    return {
      ...newGame,
      id: generated_keys[0]
    }
  })
}

function finishGame(id) {
  co(function* () {
    const newGameAt = new Date(Date.now() + 10000)
    const { replaced, changes } = yield ColorsGames.get(id).update(r.branch(r.row('state').eq(colorsStateActive), {
      newGameAt
    }, {}), { returnChanges: true })

    if(replaced <= 0) {
      logger.error(`finishGame() cannot update state to over`)
      return
    }

    // Wait for the next round to start
    yield new Promise(resolve => {
      schedule.scheduleJob(newGameAt, () => resolve())
    })

    const game = changes[0].new_val
    logger.info(`Finishing game: ${game.id} (${game.team})`)

    if(!changes[0].old_val.payoutSent) {

      yield ColorsGames.get(id).update({
        payoutSent: true
      })

      const grouped = _.groupBy(game.entries, 'team')
      const winners = grouped[game.team]

      const players = _.chain(game.entries)
        .groupBy('profile')
        .value()

      for(let id in players) {
        let entries = players[id]
        let winnerEntries = entries
          .filter(e => e.team === game.team)
          .map(e => ({
            ...e,
            tokens: e.tokens * e.multiplier
          }))

        let totalTokensPlayed = entries.reduce((t, e) => t + e.tokens, 0)
        let totalTokensWon = winnerEntries.reduce((t, e) => t + e.tokens, 0)
        let totalProfit = totalTokensWon - totalTokensPlayed

        let raffleTickets = parseInt(totalTokensPlayed / config.raffle.ratio) * getPlayerRaffleModifier(entries[0].profileName)

        let { replaced, changes } = yield Player.get(id).update({
          balance: totalTokensWon > 0 ? r.row('balance').add(totalTokensWon) : r.row('balance'),
          raffleTickets: r.row('raffleTickets').default(0).add(raffleTickets),
          totalTokensPlayed: r.row('totalTokensPlayed').default(0).add(totalTokensPlayed),
          withdrawRequirement: r.expr([ 0, r.row('withdrawRequirement').default(0).sub(totalTokensPlayed) ]).max(),
          totalTokensProfit: totalProfit > 0 ? r.row('totalTokensProfit').default(0).add(totalProfit) : r.row('totalTokensProfit').default(0),
        }, { returnChanges: true })

        if(replaced > 0) {
          if(totalTokensWon > 0) {
            PlayerBalanceHistory.insert({
              meta: {
                name: 'Colors: Win',
                gameId: game.id
              },

              amount: totalTokensWon,
              createdAt: new Date(),
              playerId: id,
            }).run()
          }

          sockets.to(id).emit('updatePlayer', {
            balance: changes[0].new_val.balance,
            raffleTickets: changes[0].new_val.raffleTickets
          })
        }
      }

      const teamStats = _
        .chain(grouped)
        .map((entries, team) => {
          const totalTokensPlayed = entries.reduce((t, e) => t + e.tokens, 0)
          const totalTokensWon = entries
            .map(e => ({
              tokens: e.team === game.team ? (e.tokens * e.multiplier) : 0
            }))
            .reduce((t, e) => t + e.tokens, 0)

          team = team.toUpperCase()

          return {
            [`totalColors${team}Played`]: 1,
            [`totalColors${team}TokensPlayed`]: totalTokensPlayed,
            [`totalColors${team}TokensWon`]: totalTokensWon,
            [`totalColors${team}Profit`]: -(totalTokensWon - totalTokensPlayed)
          }
        })
        .reduce((merged, stats) => ({
          ...merged,
          ...stats
        }), {})
        .value()

      let totalTokensPlayed = game.entries.reduce((t, e) => t + e.tokens, 0)
      let totalTokensWon = game.entries
        .filter(e => e.team === game.team)
        .reduce((t, e) => t + (e.tokens * e.multiplier), 0)
      let totalProfit = -(totalTokensWon - totalTokensPlayed)

      yield addStats({
        counters: {
          ...teamStats,
          totalTokensPlayed,
          totalTokensWon,
          totalProfit,

          totalColorsPlayed: totalTokensPlayed,
          totalColorsWon: totalTokensWon,
          totalColorsProfit: totalProfit
        }
      })
    }

    logger.info('Waiting for next round to start...')

    yield redis.rpushAsync('game:colors:history', JSON.stringify({
      id: game.id,
      roundNumber: game.roundNumber,
      hash: game.hash,
      secret: game.secret,
      team: game.team
    }))

    yield redis.ltrimAsync('game:colors:history', -30, -1)

    if(game.multiplier !== 50) {
      yield redis.incrAsync('game:colors:last50')
    } else {
      yield redis.setAsync('game:colors:last50', 0)
    }

    if(game.entries.length > 0) {
      yield ColorsGames.get(id).update({
        state: colorsStateOver
      })
    } else {
      logger.info('Old game had no entries... deleting game')
      yield ColorsGames.get(id).delete()
    }

    const newGame = yield createColorsGame()
    logger.info(`Starting new game: ${newGame.id} (${newGame.team})`)

    scheduleGame(newGame)
  })

  .catch(err => {
    logger.error(`finishGame() ${err.stack || err}`)
  })
}

function scheduleGame(game) {
  if(!!currentGameJob) {
    currentGameJob.cancel()
  }

  if(game.endsAt < new Date()) {
    return finishGame(game.id)
  }

  currentGameJob = schedule.scheduleJob(game.endsAt, () => finishGame(game.id))
}

function getColorsGame(req, res) {
  co(function* () {
    let active = null

    const games = yield ColorsGames.getAll(colorsStateActive, { index: 'state' })
    if(games.length > 0) {
      const game = games[0]

      active = {
        id: game.id,
        endsAt: game.endsAt,
        hash: game.hash,
        pot: game.pot,
        entries: game.entries
      }

      if(!!game.newGameAt) {
        active = {
          ...active,
          id: game.id,
          newGameAt: game.newGameAt,
          roundNumber: game.roundNumber,
          secret: game.secret,
          team: game.team
        }
      }
    }

    const history = yield redis.lrangeAsync('game:colors:history', 0, 30)
    const last50 = yield redis.getAsync('game:colors:last50')

    res.json({
      active,

      segments: segmentColors,
      teams: teamsArray,
      history: history.map(h => JSON.parse(h)),
      last50: parseInt(last50 || 0),

      settings: {
        minimum: tokensAmount(0.10)
      }
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getColorsGame() ${err.stack || err}`)
  })
}

function postColorsBet(req, res) {
  const { id, tokens } = req.body

  if(!is.string(id) || typeof config.games.colors.teams[id] === 'undefined') {
    return res.status(400).send('Please try again later')
  } else if(!is.number(tokens) || tokens <= 0) {
    return res.status(400).send('Invalid bet amount')
  }

  if(tokens < tokensAmount(0.10)) {
    return res.status(400).send('The minimum bet is 0.10T')
  }

  co(function* () {
    const { replaced } = yield takePlayerBalance(req.user.id, tokens, {
      meta: {
        description: 'Colors: Bet'
      }
    })

    if(replaced !== 1) {
      return res.status(400).send('You don\'t have enough tokens')
    }

    const updateResult = yield ColorsGames
      .getAll(colorsStateActive, { index: 'state' })
      .update(r.branch(r.row.hasFields('newGameAt').not(), {
        pot: r.row('pot').add(tokens),
        entries: r.row('entries').append({
          tokens,

          createdAt: new Date(),
          profile: req.user.id,
          profileName: req.user.displayName,
          profileAvatar: req.user.avatarFull,
          team: id,
          multiplier: config.games.colors.teams[id].mult
        })
      }, {}))

    if(updateResult.replaced === 0) {
      yield givePlayerBalance(req.user.id, tokens, {
        meta: {
          description: 'Colors: Bet Refund'
        }
      })

      res.status(400).send('Please wait for the current game to end')
      return
    }

    res.json({
      success: true
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getColorsGame() ${err.stack || err}`, {
      id,
      tokens
    })
  })
}

export default {
  name: 'colors',

  run: function* () {
    let currentGame = yield getCurrentColorsGame()

    if(!currentGame) {
      currentGame = yield createColorsGame()
    }

    scheduleGame(currentGame)

    // Watch for changes

    const cursor = yield ColorsGames.changes({
      includeTypes: true
    }).filter(r.row('type').eq('add').or(r.row('type').eq('change').and(r.row('new_val')('state').eq(colorsStateActive))))

    cursor.each((err, change) => {

      if(change.type === 'add') {
        sockets.to(`game:${COLORS_GAME}`).emit('colorsNew', {
          id: change.new_val.id,
          endsAt: change.new_val.endsAt,
          newGameAt: change.new_val.newGameAt,
          hash: change.new_val.hash,
          pot: change.new_val.pot
        })

        redis.set('game:colors:statistic', 0)
        sockets.emit('gameStatistic', {
          colors: 0
        })

      } else if(change.type === 'change') {
        const update = {}

        if(change.new_val.newGameAt !== change.old_val.NewGameAt) {
          update.id = change.new_val.id
          update.roundNumber = change.new_val.roundNumber
          update.newGameAt = change.new_val.newGameAt
          update.secret = change.new_val.secret
          update.team = change.new_val.team
          update.hash = change.new_val.hash
        }

        if(change.new_val.entries.length > change.old_val.entries.length) {
          update.entries = change.new_val.entries.slice(change.old_val.entries.length)

          redis.set('game:colors:statistic', change.new_val.pot)
          sockets.emit('gameStatistic', {
            colors: change.new_val.pot
          })
        }

        if(Object.keys(update).length > 0) {
          sockets.to(`game:${COLORS_GAME}`).emit('colorsChanged', update)
        }
      }
    })
  },

  router() {
    const router = Router()
    router.get('/', getColorsGame)
    router.post('/bet', ensureAuthenticated, ensureGameEnabled(COLORS_GAME), postColorsBet)
    return router
  }

}

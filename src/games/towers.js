
import { Router } from 'express'
import co from 'co'
import config from 'config'
import is from 'is_js'
import numeral from 'numeral'
import random from 'random-seed'
import crypto from 'crypto'
import _ from 'underscore'

import { TOWERS_GAME } from '../games'
import { ensureAuthenticated, ensureGameEnabled } from '../lib/middleware'
import { tokensAmount } from '../lib/tokens'
import r from '../lib/database'
import Player, { PlayerBalanceHistory, takePlayerBalance, getPlayerRaffleModifier } from '../document/player'
import TowersGames from '../document/towers'
import { addStats, addPlayerStats } from '../document/stats'
import redis from '../lib/redis'
import logger from '../lib/logger'
import sockets from '../lib/sockets'

const stateActive = 'ACTIVE'
const stateEnded  = 'ENDED'

export const gameModes = {
  'easy': {
    id: 'easy',
    name: 'Easy',

    bombs: 1,
    fields: 3,
    maxBet: tokensAmount(500),
    minBet: tokensAmount(0.10),
    multiplier: 1.45,
    difficulty: 1,

    breakPoints: buildBreakPoints([
      [0, 10],
      [235, 8],
      [285, 7],
      [330, 6],
      [370, 5],
      [405, 3],
      [500, 3],
    ])
  },

  'medium': {
    id: 'medium',
    name: 'Medium',

    bombs: 1,
    fields: 2,
    maxBet: tokensAmount(200),
    minBet: tokensAmount(0.10),
    multiplier: 1.95,
    difficulty: 2,

    breakPoints: buildBreakPoints([
      [0, 10],
      [10, 9],
      [18, 8],
      [32, 7],
      [56, 6],
      [87, 5],
      [120, 4],
      [150, 3],
      [200, 3]
    ])
  },

  'hard': {
    id: 'hard',
    name: 'Hard',

    bombs: 2,
    fields: 3,
    maxBet: tokensAmount(50),
    minBet: tokensAmount(0.10),
    multiplier: 2.95,
    difficulty: 3,

    breakPoints: buildBreakPoints([
      [0, 10],
      [2, 9],
      [6, 8],
      [4.7, 6],
      [12, 5],
      [25, 4],
      [36, 3],
      [50, 3]
    ])
  }
}

function buildBreakPoints(points) {
  points = points.map(point =>
    ([ tokensAmount(point[0]), point[1] ])
  )

  const build = []

  for(let i = 0; i < points.length; i++) {
    let point = points[i]
    let maxAmount = point[0] + tokensAmount(1)

    if(i < points.length-1) {
      maxAmount = points[i+1][0]
    }

    build.push({
      maxAmount,

      minAmount: point[0],
      steps: parseInt(point[1])
    })
  }

	return build
}

function formatGame(game) {
  return _.omit(game, 'secret', 'bombs')
}

function formatGameHistory(game, player) {
  return {
    id: game.id,
    playerName: game.player.displayName,
    playerAvatar: game.player.avatar,
    playerProfit: game.cashedOut ? game.rewardProfit : -game.wager,
    wagered: game.wager,
    steps: game.chosenSteps.length,
    difficultyName: game.modeOptions.name,
    difficulty: game.modeOptions.difficulty
  }
}

function* finishGame(game, player) {

  // Add to stats
  yield addStats({
    counters: {
      totalTokensPlayed: !game.demo ? game.wager : 0,
      totalProfit: !game.demo ? game.cashedOut ? -game.rewardProfit : game.wager : 0,

      totalTowersPlayed: !game.demo ? 1 : 0,
      totalTowersDemosPlayed: game.demo ? 1 : 0,
      totalTowersWon: !game.demo && game.cashedOut ? 1 : 0,
      totalTowersProfit: !game.demo ? game.cashedOut ? -game.rewardProfit : game.wager : 0,

      [`totalTowers${game.modeOptions.name}Played`]: !game.demo ? 1 : 0,
      [`totalTowers${game.modeOptions.name}Won`]: !game.demo && game.cashedOut ? 1 : 0,
      [`totalTowers${game.modeOptions.name}Profit`]: !game.demo ? game.cashedOut ? -game.rewardProfit : game.wager : 0,
    }
  })

  // const playerProfit = !game.demo ? game.cashedOut ? game.rewardProfit : -game.wager : 0
  //
  // yield addPlayerStats(player.id, {
  //   counters: {
  //     totalTokensPlayed: !game.demo ? game.wager : 0,
  //     totalProfit: playerProfit,
  //
  //     totalTowersPlayed: !game.demo ? 1 : 0,
  //     totalTowersDemosPlayed: game.demo ? 1 : 0,
  //     totalTowersWon: !game.demo && game.cashedOut ? 1 : 0,
  //     totalTowersProfit: playerProfit,
  //
  //     [`totalTowers${game.modeOptions.name}Played`]: !game.demo ? 1 : 0,
  //     [`totalTowers${game.modeOptions.name}Won`]: !game.demo && game.cashedOut ? 1 : 0,
  //     [`totalTowers${game.modeOptions.name}Profit`]: playerProfit,
  //   }
  // })

  if(game.demo) {
    yield TowersGames.get(game.id).delete()
    return
  }

  const raffleTickets = parseInt(game.wager / config.raffle.ratio) * getPlayerRaffleModifier(player.displayName)

  const { replaced, changes } = yield Player.get(player.id).update({
    balance: game.cashedOut ? r.row('balance').add(game.reward) : r.row('balance'),
    raffleTickets: r.row('raffleTickets').default(0).add(raffleTickets),
    totalTokensPlayed: r.row('totalTokensPlayed').default(0).add(game.wager),
    withdrawRequirement: r.expr([ 0, r.row('withdrawRequirement').default(0).sub(game.wager) ]).max(),
    totalTokensProfit: game.cashedOut ? r.row('totalTokensProfit').default(0).add(game.rewardProfit) : r.row('totalTokensProfit').default(0),
  }, { returnChanges: true })

  if(replaced > 0) {
    if(game.cashedOut) {
      PlayerBalanceHistory.insert({
        meta: {
          name: 'Towers: Claim',
          gameId: game.id
        },
        amount: game.reward,

        createdAt: new Date(),
        playerId: game.playerId,
      }).run()
    }

    sockets.to(player.id).emit('updatePlayer', {
      balance: changes[0].new_val.balance,
      raffleTickets: changes[0].new_val.raffleTickets
    })
  }

  // Add to history
  sockets.to(`game:${TOWERS_GAME}`).emit('addTowersHistory', formatGameHistory(game))
}

function getTowersGame(req, res) {
  co(function* () {
    let history = []

    const cachedHistory = yield redis.getAsync('boss:towers:history')

    if(!cachedHistory) {
      history = _
        .chain(yield TowersGames
          .between([ 'ENDED', r.now().sub(60) ], [ 'ENDED', r.maxval ], { index: 'stateCreatedAt' })
          .filter({ demo: false })
          .orderBy(r.desc('createdAt'))
          .limit(30)
        )
        .map(formatGameHistory)
        .value()

      redis.set('boss:towers:history', JSON.stringify(history))
      redis.expire('boss:towers:history', 5)
     } else {
       history = JSON.parse(cachedHistory)
     }

    const response = {
      gameModes,
      history
    }

    if(!!req.user) {
      const currentGames = yield TowersGames.getAll([ req.user.id, stateActive ], { index: 'playerIdState' })

      if(currentGames.length) {
        response.currentGame = formatGame(currentGames[0])
      }
    }

    res.json(response)
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getTowersGame() ${err}`)
  })
}

function postTowersTake(req, res) {
  co(function* () {
    const rewardField = r.branch(r.row('chosenSteps').count().gt(0), r.row('rewards').nth(r.row('chosenSteps').count().sub(1)), r.row('wager'))

    const { replaced, changes } = yield TowersGames
      .getAll([ req.params.id, req.user.id, stateActive ], { index: 'idPlayerIdState' })
      .update(r.branch( r.row('state').eq(stateActive).and(r.row('chosenSteps').default([]).count().gt(0)), {
        state: stateEnded,
        reward: rewardField,
        rewardProfit: rewardField.sub(r.row('wager')),
        cashedOut: true
      }, { }), { returnChanges: true })

    if(replaced <= 0) {
      return res.status(400).send('You must make at least 1 move before cashing out')
    }

    const change = changes[0].new_val

    yield co(finishGame, change, req.user)

    res.json({
      reward: change.reward,
      secret: change.secret,
      bombs: change.bombs
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postTowersTake() ${err}`)
  })
}

function postTowersStep(req, res) {
  let { step } = req.body

  if(!is.number(step) || step < 0) {
    return res.status(400).send('Invalid request')
  }

  co(function* () {
    const currentGames = yield TowersGames.getAll([ req.params.id, req.user.id, stateActive ], { index: 'idPlayerIdState' })

    if(currentGames.length <= 0) {
      return res.status(400).send('Cannot find active game')
    }

    const currentGame = currentGames[0]

    if(step >= currentGame.modeOptions.fields) {
      return res.status(400).send('Invalid selection')
    }

    const currentStep = currentGame.chosenSteps.length
    if(currentStep >= currentGame.breakPoint.steps) {
      return res.status(400).send('There are no more steps to make')
    }

    const nextReward = (currentStep + 1) < currentGame.rewards.length ? currentGame.rewards[currentStep + 1] : currentGame.rewards[currentStep]

    const chosenStepsField = r.row('chosenSteps')
    const bombsField = r.row('bombs')
    const modeOptionsBombsField = r.row('modeOptions')('bombs')

    const { replaced, changes } = yield TowersGames
      .get(currentGame.id)
      .update(r.branch(r.row('state').eq(stateActive).and(
        chosenStepsField.count().eq(currentGame.chosenSteps.length).and(chosenStepsField.count().lt(r.row('breakPoint')('steps')))
      ), {
          chosenSteps: chosenStepsField.append(step),
          state: r.branch(modeOptionsBombsField.gt(1),
            r.branch(bombsField.nth(chosenStepsField.count()).eq(step), stateActive, stateEnded),
            r.branch(bombsField.nth(chosenStepsField.count()).ne(step), stateActive, stateEnded)
          )
        }, {})
      , { returnChanges: true })

    if(replaced <= 0) {
      return res.status(400).send('Please try again later')
    }

    const change = changes[0].new_val

    if(change.state === stateActive) {
      return res.json({
        nextReward,
        state: change.state
      })
    }

    yield co(finishGame, change, req.user)

    res.json({
      state: change.state,
      secret: change.secret,
      bombs: change.bombs
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postTowersStep() ${err}`, {
      step
    })
  })
}

function postTowersStart(req, res) {
  let { demo, gameMode, betAmount } = req.body

  co(function* () {
    if((demo && !is.boolean(demo)) || !is.string(gameMode) || !is.number(betAmount)) {
      return res.status(400).send('Invalid request')
    } else if(typeof gameModes[gameMode] === 'undefined') {
      return res.status(400).send('Invalid game mode')
    }

    const mode = gameModes[gameMode]
    if(betAmount < mode.minBet) {
      return res.status(400).send(`The minimum bet is ${numeral(mode.minBet).format('0,0.00')}T`)
    } else if(betAmount > mode.maxBet) {
      return res.status(400).send(`The maximum bet is ${numeral(mode.maxBet).format('0,0.00')}T`)
    }

    const k = `towers:start:${req.user.id}`
    const v = yield redis.getAsync(k)

    if(v) {
      return res.status(400).send('You can only create a game once every 2 seconds')
    }

    redis.set(k, Date.now())
    redis.expire(k, 2)

    const { user } = req

    const existsCount = yield TowersGames.getAll([ user.id, stateActive ], { index: 'playerIdState' }).count()
    if(existsCount > 0) {
      return res.status(400).send('Please finish your current game before starting a new one')
    }

    demo = (!!demo && demo) || user.balance < mode.minBet

    if(!demo) {
      const { replaced } = yield takePlayerBalance(user.id, betAmount, {
        meta: {
          description: 'Towers: Bet'
        }
      })

      if(replaced !== 1) {
        return res.status(400).send('You don\'t have enough tokens')
      }
    }

    const breakPoint = mode.breakPoints.reduce((c, p) =>
      betAmount >= p.minAmount &&  betAmount < p.maxAmount ? p : c
    , mode.breakPoints[0])

    if(!breakPoint) {
      logger.error(`postTowersStart() cannot find game mode breakpoint`, {
        betAmount,
        playerId: user.id
      })

      return res.status(400).send('An error occurred, contact support')
    }

    const rand = random.create()

    const rewards = Array.from({
      length: breakPoint.steps
    }, (_, i) =>
      betAmount * Math.pow(mode.multiplier, i + 1)
    )

    const bombs = Array.from({
      length: breakPoint.steps
    }, (_, i) =>
      rand(mode.fields)
    )

    const secret = `${bombs.join('-')}-${rand.string(12)}`
    const hash = crypto.createHash('sha256').update(secret).digest('hex')

    const newGame = {
      demo,
      breakPoint,
      rewards,
      bombs,
      hash,
      secret,

      createdAt: new Date(),
      playerId: user.id,
      state: stateActive,
      wager: betAmount,
      mode: gameMode,
      modeOptions: mode,

      chosenSteps: []
    }

    if(!demo) {
      newGame.player = {
        displayName: user.displayName,
        avatar: user.avatarFull
      }
    }

    const { inserted, generated_keys } = yield r.expr(1).do(() =>
      r.branch(
        TowersGames.getAll([ user.id, stateActive ], { index: 'playerIdState' }).count().eq(0),
        TowersGames.insert(newGame),
        r.error('already created game')
      )
    )

    //.insert(newGame).run()

    if(inserted <= 0) {
      logger.error('postTowersStart() cannot insert game', {
        betAmount,
        playerId: user.id
      })

      return res.status(400).send('An error occurred, contact support')
    }

    newGame.id = generated_keys[0]
    res.json(formatGame(newGame))
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postTowersStart() ${err}`, {
      demo,
      gameMode,
      betAmount
    })
  })
}

export default {
  name: 'towers',

  router() {
    const router = Router()
    router.get('/', getTowersGame)
    router.post('/start', ensureAuthenticated, ensureGameEnabled(TOWERS_GAME), postTowersStart)
    router.post('/step/:id', ensureAuthenticated, ensureGameEnabled(TOWERS_GAME), postTowersStep)
    router.post('/take/:id', ensureAuthenticated, ensureGameEnabled(TOWERS_GAME), postTowersTake)
    return router
  }

}

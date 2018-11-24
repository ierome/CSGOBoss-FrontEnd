
import { Router } from 'express'
import co from 'co'
import _ from 'underscore'
import numeral from 'numeral'

import Players, { getPlayerRaffleModifier, givePlayerBalance } from '../document/player'
import { addStats } from '../document/stats'
import logger from '../lib/logger'
import recaptcha from '../lib/recaptcha'
import redis from '../lib/redis'
import r from '../lib/database'
import { getCSGOHours, getSteamGroup } from '../lib/steam'
import { tokensAmount } from '../lib/tokens'

function getFreeTokens(req, res) {
  res.json({
    nextFreeDailyTokensAt: req.user.nextFreeDailyTokensAt,
    redeemedSteamFollow: req.user.redeemedSteamFollow || false
  })
}

function postClaimDaily(req, res) {
  co(function* () {

    const v = yield redis.getAsync('toggle:freeTokens')
    if(v) {
      return res.status(400).send(v)
    }

    const captchaOk = yield recaptcha.validate(req.body.captcha)
    if(!captchaOk) {
      return res.status(400).send('Invalid captcha, please try again')
    }

    if(getPlayerRaffleModifier(req.user.displayName) !== 2) {
      return res.status(400).send('You must have csgoboss in your name to claim this reward')
    } else if(req.user.dailyTokensRemaining <= 0 && req.user.dailyTokensRequirement > 0) {
      return res.status(400).send(`You must deposit at least ${numeral(req.user.dailyTokensRequirement).format('0,0.00')}T to start claiming daily tokens again`)
    }

    const now = new Date()
    if(!!req.user.nextFreeDailyTokensAt && now < req.user.nextFreeDailyTokensAt) {
      return res.status(400).send('You have already collected your daily tokens, please try again in 24 hours')
    }

    const hours = yield getCSGOHours(req.user.id)
    if(hours < 10) {
      return res.status(400).send('You need at least 10 hours of CS:GO to claim this reward')
    }

    const nextFreeDailyTokensAt = new Date(Date.now() + (86400 * 1000))
    const reward = tokensAmount(0.10)

    const dailyTokensRemaining = r.branch(r.row('dailyTokensRemaining').default(0).eq(0).and(r.row('dailyTokensRequirement').default(0).eq(0)), 7, r.row('dailyTokensRemaining').default(7))

    const { replaced, changes } = yield Players.get(req.user.id).update(r.branch(dailyTokensRemaining.ge(1), {
      nextFreeDailyTokensAt,
      dailyTokensRemaining: dailyTokensRemaining.sub(1),
      dailyTokensRequirement: r.branch(dailyTokensRemaining.eq(1), tokensAmount(10), 0)
    }, {

    }))

    if(replaced <= 0) {
      return res.status(400).send('You must deposit at least 10T to continue claiming daily tokens')
    }

    yield givePlayerBalance(req.user.id, reward, {
      meta: {
        description: 'Reward: Daily Free Tokens'
      }
    })

    yield addStats({
      counters: {
        totalProfit: -reward,
        totalDailyClaimed: 1,
        totalDailyClaimedProfit: -reward
      }
    })

    res.json({
      nextFreeDailyTokensAt,
      reward
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postClaimDaily() ${err.stack || err}`)
  })
}

function postClaimSteamFollow(req, res) {
  co(function* () {

    const v = yield redis.getAsync('toggle:freeTokens')
    if(v) {
      return res.status(400).send(v)
    }


    if(req.user.redeemedSteamFollow) {
      return res.status(400).send('You have already claimed this reward')
    } else if(getPlayerRaffleModifier(req.user.displayName) !== 2) {
      return res.status(400).send('You must have csgoboss in your name to claim this reward')
    }

    const hours = yield getCSGOHours(req.user.id)
    if(hours < 10) {
      return res.status(400).send('You need at least 10 hours of CS:GO to claim this reward')
    }

    const g = yield getSteamGroup(req.user.id, '103582791454926192')
    if(!g) {
      return res.status(400).send('Join our Steam group to claim this reward. If you already did, please wait a couple minutes and try again.')
    }

    const { replaced } = yield Players.get(req.user.id).update({
      redeemedSteamFollow: true
    })

    if(replaced <= 0) {
      return res.status(400).send('You have already claimed this reward')
    }

    const reward = tokensAmount(0.05)

    yield givePlayerBalance(req.user.id, reward, {
      meta: {
        description: 'Reward: Steam Follow'
      }
    })

    yield addStats({
      counters: {
        totalProfit: -reward,
        totalSteamClaimed: 1,
        totalSteamClaimedProfit: -reward
      }
    })

    res.json({
      reward
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`postClaimSteamFollow() ${err.stack || err}`)
  })
}

export default () => {
  const router = Router()
  router.get('/', getFreeTokens)
  router.post('/claim-daily', postClaimDaily)
  router.post('/claim-steamfollow', postClaimSteamFollow)
  return router
}

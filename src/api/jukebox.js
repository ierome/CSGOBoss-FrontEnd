
import { Router } from 'express'
import co from 'co'
import _ from 'underscore'
import numeral from 'numeral'
import is from 'is_js'

import Players, { getPlayerRaffleModifier, givePlayerBalance } from '../document/player'
import { addStats } from '../document/stats'
import logger from '../lib/logger'
import recaptcha from '../lib/recaptcha'
import redis from '../lib/redis'
import r from '../lib/database'
import sockets from '../lib/sockets'
import { getCSGOHours, getSteamGroup } from '../lib/steam'
import { tokensAmount } from '../lib/tokens'

function getJukebox(req, res) {
  co(function* () {
    const lastSong = yield redis.getAsync('jukebox:current')

    res.json({
      lastSong: !!lastSong ? JSON.parse(lastSong) : null
    })
  })

  .catch(err => {
    logger.error(`getJukebox() ${err}`)
    res.status(400).send('Please try again later')
  })
}

function postPlay(req, res) {
  const { url } = req.body

  if(!is.string(url)) {
    return res.status(400).send('Invalid Soundcloud URL')
  }

  co(function* () {
    const startedAt = new Date()

    redis.set('jukebox:current', JSON.stringify({
      url,
      startedAt
    }))

    sockets.emit('jukebox:play', {
      url,
      startedAt
    })

    res.json({
      success: true
    })
  })

  .catch(err => {
    logger.error(`postPlay() ${err}`)
    res.status(400).send('Please try again later')
  })
}

export default () => {
  const router = Router()
  router.get('/', getJukebox)
  router.post('/play', postPlay)
  return router
}

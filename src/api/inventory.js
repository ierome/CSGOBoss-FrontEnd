
import { Router } from 'express'
import config from 'config'
import co from 'co'
import is from 'is_js'
import _ from 'underscore'

import { fetchInventory, deposit } from '../lib/sknexchange'
import logger from '../lib/logger'
import redis from '../lib/redis'

export function getInventory(req, res) {
  co(function* () {
    const refresh = !!req.query.refresh && req.query.refresh.length > 0

    const v = yield redis.getAsync('csgoboss:skne:blacklisted')
    const blacklistedItems = !!v ? v.split('\n') : []

    const response = yield fetchInventory(req.user.id, {
      refresh,
      blacklistedItems
    })

    res.json(response.result.items.map(i => ({
      ..._.pick(i, 'name', 'nameColor', 'id', 'assetId', 'wear', 'cleanName', 'icon', 'price', 'tokens'),
      tokens: i.baseTokens
    })))
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getInventory() ${err.stack || err}`)
  })
}

export function postInventoryDeposit(req, res) {
  if(!is.array(req.body)) {
    return res.status(400).send('Invalid request')
  }

  const assetIds = req.body.filter(is.number)
  if(assetIds.length <= 0) {
    return res.status(400).send('Invalid request')
  }

  if(!req.user.tradeLink) {
   return res.status(400).send('Please set a valid steam trade offer url first')
  }

  co(function* () {
   const response = yield deposit({
     assetIds,

     notifyUrl: config.sknexchange.notifyUrl,
     steamId64: req.user.id,
     tradeLink: req.user.tradeLink,
     depositGroup: 'deposit'
   })

   res.json({
     tradeOffer: response.tradeOffer
   })
  })

  .catch(err => {
   res.status(400).send('Please try again later')
   logger.error(`postInventoryDeposit() ${err.stack || err}`)
  })
}

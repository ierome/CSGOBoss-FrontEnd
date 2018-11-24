
import { Router } from 'express'
import config from 'config'
import co from 'co'
import is from 'is_js'
import _ from 'underscore'
import numeral from 'numeral'

import { takePlayerBalance, givePlayerBalance } from '../document/player'
import * as sknexchange from '../lib/sknexchange'
import logger from '../lib/logger'
import redis from '../lib/redis'
import r from '../lib/database'

export function getMarketplace(req, res) {
  let { search, order } = req.query
  let page = parseInt(req.query.page)

  co(function* () {
    const perPage = 40

    let asc = order === 'ASC'

    let query = sknexchange
      .BotItems
      .between(['deposit', 'AVAILABLE', 0], ['deposit', 'AVAILABLE', r.maxval], { index: 'groupsStateTokens' })
      .orderBy({ index: asc ? r.asc('groupsStateTokens') : r.desc('groupsStateTokens') })

    if(!!search && search.length) {
      query = query.filter(r.row('name').match(`(?i)${search}`))
    }

    const totalItems = yield query.count()
    const pages = Math.ceil(totalItems / perPage)

    if(page > pages) {
      page = pages
    } else if(!page || page <= 0) {
      page = 1
    }

    const start = Math.max((page - 1) * perPage, 0)
    const items = yield query
      .slice(start, start + perPage)

    res.json({
      totalItems,
      pages,
      page,
      items
    })
  })

  .catch(err => {
    res.status(400).send('Please try again later')
    logger.error(`getMarketplace() ${err.stack || err}`)
  })
}

export function postMarketplacePurchase(req, res) {
  if(!is.array(req.body)) {
    return res.status(400).send('Invalid request')
  }

  const assetIds = req.body.filter(is.number)
  if(assetIds.length <= 0) {
    return res.status(400).send('Invalid request')
  } else if(req.user.transferLock) {
    return res.status(400).send('Please try again later')
  } else if(!req.user.admin && req.user.withdrawRequirement > 0) {
    return res.status(400).send(`You need to play ${numeral(req.user.withdrawRequirement).format('0,0.00')}T more tokens before withdrawing`)
  } else if(!req.user.tradeLink) {
    return res.status(400).send('Please set a valid steam trade offer url first')
  }

  co(function* () {

    const disabled = yield redis.getAsync(`skne:disable:withdraw`)
    if(disabled) {
      return res.status(400).send('Bots are currently down and will be back soon')
    }

    const botItems = yield sknexchange
      .BotItems
      .getAll(r.args(assetIds.map(i => [ 'deposit', i ])), { index: 'groupsAssetId' })
      .eqJoin('name', sknexchange.Items, { index: 'name' })
      .zip()

    const v = botItems.reduce((t, i) => t + i.tokens, 0)

    if(v <= 0) {
      throw new Error('value <= 0')
      return
    }

    const { replaced } = yield takePlayerBalance(req.user.id, v, {
      meta: {
        description: 'Market: Purchase'
      }
    })

    if(replaced !== 1) {
      return res.status(400).send('You don\'t have enough tokens')
    }

    let response = null

    try {
      response = yield sknexchange.withdraw({
        assetIds: _.pluck(botItems, 'assetId'),
        notifyUrl: config.sknexchange.notifyUrl,
        steamId64: req.user.id,
        tradeLink: req.user.tradeLink
      })
    } catch(err) {

      yield givePlayerBalance(req.user.id, v, {
        meta: {
          description: 'Market: Purchase Refund'
        }
      })

      res.status(400).send('Please try again later')
      logger.error(`getMarketplace() ${err.stack || err}`)
      return
    }

    res.json({
      unavailable: response.unavailable,
      tradeOffers: _.map(response.tradeOffers, t => _.pick(t, 'id', 'botName', 'bot', 'assetIds', 'itemNames', 'securityToken', 'steamId64', 'state', 'type', 'tradeLink', 'subtotal'))
    })
  })

  .catch(err => {
    console.log(err)
    res.status(400).send('Please try again later')
    logger.error(`getMarketplace() ${err.stack || err}`)
  })
}

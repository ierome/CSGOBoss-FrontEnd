
import jayson from 'jayson'
import config from 'config'
import url from 'url'
import co from 'co'

import r from './database'
import redis from './redis'

export const db = r.db('sknexchange')
export const Items = db.table('Items')
export const BotItems = db.table('BotItems')

const options = url.parse(config.sknexchange.rpcUrl)
const client = jayson.client.http({
  ...options,
  replacer: (key, value) => {
    return value
  }
})

export function doRequest(method, args) {
  return new Promise((resolve, reject) => {
    client.request(method, args, (err, response) =>
      (err || response.error) ? reject(err || response.error) : resolve(response.result)
    )
  })
}

// fetchInventory
export function fetchInventory(id, options = {}) {
  return new Promise((resolve, reject) => {
    client.request('inventory.fetch', [{ steamId64: id, details: true, ...options }], function(err, result) {
      if(err || result.error) {
        return reject(err || result.error)
      }

      resolve(result)
    })
  })
}

// getBotItemsValue
export function getBotItemsValue(options) {
  return doRequest('items.value', [options])
}

// withdraw
export function withdraw(options) {
  return doRequest('inventory.withdraw', [options])
}

// deposit
export function deposit(options) {
  return doRequest('inventory.deposit', [options])
}

// cancelOffer
export function cancelOffer(id, steamId64) {
  return doRequest('offers.cancel', [{ id, steamId64 }])
}

// refundOffer
export function refundOffer(tradeOfferId, meta, opts = {}) {
  return doRequest('trade.refund', [{ tradeOfferId, meta, ...opts }])
}

// getBots
export function getBots() {
  return doRequest('bot.getAll', [])
}

// getOffers
export function getOffers(steamId64) {
  return doRequest('offers.fetch', [{
    steamId64
  }])
}

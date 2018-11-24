
import co from 'co'
import socketIO from 'socket.io'
import config from 'config'
import redis from 'socket.io-redis'
import is from 'is_js'

import { getMachineId } from './util'
import * as chat from './chat'
import redisClient from './redis'
import logger from './logger'
import games from '../games'
import Player from '../document/player'

const io = socketIO()
io.adapter(redis(config.redis))

export default io

let _onlineCount = 0

function storeOnlineCount() {
  co(function* () {
    const key = `boss:online:${getMachineId()}`

    yield redisClient.setAsync(key, _onlineCount)
    yield redisClient.expireAsync(key, 60 * 5)
  })
}

export function getOnlineCount() {
  return co(function* () {
    const cached = yield redisClient.getAsync('boss:online')
    if(cached) {
      return parseInt(cached)
    }

    const keys = yield redisClient.keysAsync('boss:online:*')
    let online = 0

    for(let key of keys) {
      online += parseInt(yield redisClient.getAsync(key))
    }

    yield redisClient.setAsync('boss:online', online)
    yield redisClient.expireAsync('boss:online', 5)

    io.emit('onlineCount', online)

    return online
  })

  .catch(console.log)
}

io.on('connection', socket => {
  const { session: { passport }, locale } = socket.request

  socket._sendChatMessage = message => socket.emit('chatMessage', message)

  co(function* () {

    // Get user if possible
    if(passport && passport.user) {
      socket._player = yield Player.get(passport.user).run()

      if(socket._player) {
        socket.join(passport.user)
      }
    }

    // Join the chat channel
    socket._chatChannel = chat.channels[0]
    socket.join(`chat:${socket._chatChannel}`)

    ++_onlineCount
    storeOnlineCount()

    socket.on('setChatChannel', channel => {
      if(!is.string(channel) || chat.channels.indexOf(channel) < 0 || socket._chatChannel === channel) {
        return
      }

      socket.leave(`chat:${socket._chatChannel}`)

      socket._chatChannel = channel
      socket.join(`chat:${socket._chatChannel}`)
    })

    socket.on('setActiveGame', id => {
      if(!is.number(id)) {
        return
      }

      if(games.indexOf(id) < 0 || socket._lastActiveGame === id) {
        return
      }

      if(!!socket._lastActiveGame) {
        socket.leave(`game:${socket._lastActiveGame}`)
      }

      socket.join(`game:${id}`)
      socket._lastActiveGame = id
    })

    if(!!socket._player) {
      socket.on('sendChatMessage', e => {
        if(!is.string(e.message)) {
          return
        }

        e.message = e.message.trim()
        if(e.message.length <= 0 || e.message.length > 255) {
          return
        }

        chat.publishMessage(socket, e.message)
      })
    }

    socket.on('disconnect', () => {
      --_onlineCount
      storeOnlineCount()
    })

  })

  .catch(err => {
    logger.error(`socket connection: ${err}`)
  })
})

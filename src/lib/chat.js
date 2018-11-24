
import co from 'co'
import numeral from 'numeral'
import moment from 'moment'
import Limiter from 'ratelimiter'
import parseDuration from 'parse-duration'

import Player from '../document/player'
import ChatHistory from '../document/chatHistory'
import { tokensAmount } from './tokens'
import redis from './redis'
import logger from './logger'
import sockets from './sockets'

// Available chat channels
export const channels     = [ 'us', 'ru', 'es']

// Chat history
export const chatHistorySize = 50

// Error message style
export const errorMessageStyle = {
  container: {
    background: '#f44336'
  },

  message: {
    fontWeight: '900'
  }
}

// Purple message style
export const purpleMessageStyle = {
  container: {
    background: '#6138aa'
  },

  message: {
    fontWeight: '900'
  }
}

// publishMessage
export function publishMessage(socket, message) {
  return co(function* () {

    const { _player } = socket

    if(!_player.admin) {

      // Spam
      const limiter = new Limiter({
        max: 2,
        duration: 1000,
        id: `chat:${_player.id}`,
        db: redis
      })

      const remaining = yield new Promise((resolve, reject) => {
        limiter.get((err, limit) => {
          if(err) {
            return reject(err)
          }

          resolve(limit.remaining)
        })
      })

      if(remaining <= 0) {
        socket._sendChatMessage({
          styles: errorMessageStyle,
          message: 'Slow down!!! You\'re speaking way to fast!'
        })

        return
      }

      const disabled = yield redis.getAsync('boss:disable:chat')

      if(disabled) {
        socket._sendChatMessage({
          styles: errorMessageStyle,
          name: 'Chat Cooldown',
          message: disabled
        })

        return
      }

      // Chat mutes
      if(_player.muted && !!_player.muteExpiration) {
        const now = new Date()

        if(now < _player.muteExpiration) {
          socket._sendChatMessage({
            styles: errorMessageStyle,
            message: `You have been muted for "${_player.muteReason}". Expires ${moment(_player.muteExpiration).fromNow()}.`
          })

          return
        }
      }

      const chatRequirement = tokensAmount(2)

      if(!_player.totalTokensPlayed || _player.totalTokensPlayed < chatRequirement) {
        socket._sendChatMessage({
          styles: errorMessageStyle,
          message: `You need to play at least ${numeral(chatRequirement).format('0,0.00')}T before being able to chat!`
        })

        return
      }
    }

    // Commands
    if(message.indexOf('/') === 0) {
      const args = message.substring(1).split(' ')

      if(_player.admin) {
        if(args[0] === 'juke' && args.length >= 2) {
          if(args[1] === 'stop') {
            redis.del('jukebox:current')
            sockets.emit('jukebox:stop')
          }
        }

        if(args[0] === 'enable' && args.length >= 2) {
          redis.del(`boss:disable:${args[1]}`)
        } else if(args[0] === 'cooldown' && args.length >= 3) {
          const duration  = parseDuration(args[1])
          const message   = args[2]

          sockets.emit('chatMessage', {
            message,

            styles: purpleMessageStyle,
            name: `Chat Cooldown`
          })

          redis.set('boss:disable:chat', args[2])
          redis.expire('boss:disable:chat', duration / 1000)
        }
      }

      return
    }

    const chatChannel = socket._chatChannel || channels[0]

    const newMessage = {
      message,
      name: _player.displayName,
      avatar: _player.avatarFull,
      steamId: _player.id,
      canMute: !_player.admin
    }

    if(_player.admin) {
      newMessage.styles = {
        header: {
          color: 'rgb(137, 73, 251)'
        },

        message: {
          fontWeight: 900
        }
      }
    } else if(_player.mod) {
      newMessage.styles = {
        label: 'MOD',
        labelStyle: {
          background: '#3f51b5'
        }
      }
    } else if(!!_player.groups && !!_player.groups.indexOf('youtuber') >= 0) {
      newMessage.styles = {
        icon: 'fa-youtube-play',
        header: {
          color: '#e53935'
        }
      }
    }

    sockets.to(`chat:${chatChannel}`).emit('chatMessage', newMessage)

    // ChatHistory.insert({
    //   ...newMessage,
    //   chatChannel,
    //
    //   createdAt: new Date()
    // }, {
    //   durability: 'soft'
    // }).run()
  })
}

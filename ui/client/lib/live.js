
import io from 'socket.io-client'
import ui from 'uikit'

import store from 'store'
import * as serverActions from 'reducers/server/actions'
import * as userActions from 'reducers/currentUser/actions'
import * as raffleActions from 'reducers/raffles/actions'
import { setStatistic } from 'reducers/statistics/actions'

const client = io(API_URL)

let _lastActiveGame = null

export function setActiveGame(id) {
  _lastActiveGame = id
  client.emit('setActiveGame', id)
}

client.on('connect', () => {
  if(_lastActiveGame !== null) {
    setActiveGame(_lastActiveGame)
  }
})

client.on('onlineCount', online =>
  store.dispatch(serverActions.setValue({
    online
  }))
)

client.on('updatePlayer', update =>
  store.dispatch(userActions.updateCurrentUser(update))
)

client.on('gameStatistic', update =>
  store.dispatch(setStatistic(update))
)

client.on('rafflesChanged', raffle =>
  store.dispatch(raffleActions.updateRaffle(raffle))
)

client.on('newRaffle', raffle =>
  store.dispatch(raffleActions.addRaffle(raffle))
)

client.on('removeRaffle', id =>
  store.dispatch(raffleActions.removeRaffle(id))
)

client.on('notify', notification =>
  ui.notification(notification)
)

export default client

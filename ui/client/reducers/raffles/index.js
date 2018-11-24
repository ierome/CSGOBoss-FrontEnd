
import { handleActions } from 'redux-actions'
import Immutable from 'seamless-immutable'
import _ from 'underscore'

import { PACKET_ONLINE_COUNT } from 'constants/packet'
import { SET_RAFFLES, UPDATE_RAFFLE, ADD_RAFFLE } from './constants'

const initialState = Immutable([])

export default handleActions({
  [SET_RAFFLES] (state, { payload }) {
    return Immutable(payload)
  },

  [UPDATE_RAFFLE] (state, { payload }) {
    const idx = _.findIndex(state, {
      id: payload.id
    })

    if(idx >= 0) {
      return state.updateIn([ idx ], raffle => raffle.merge(payload))
    }

    return state
  },

  [ADD_RAFFLE] (state, { payload }) {
    return state.concat(Immutable(payload))
  }
}, initialState)

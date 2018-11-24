
import { handleActions } from 'redux-actions'
import Immutable from 'seamless-immutable'

import { PACKET_ONLINE_COUNT } from 'constants/packet'
import { SET_VALUE } from './constants'

const initialState = Immutable({
  online: 0,
  version: null,
  chatChannels: []
})

export default handleActions({
  [SET_VALUE] (state, { payload }) {

    if(!!state.version && !!payload.version && state.version !== payload.version) {
      payload.outdated = true
    }

    return state.merge(Immutable(payload))
  },

  [PACKET_ONLINE_COUNT] (state, { payload }) {
    return state.set('online', payload.online)
  }
}, initialState)

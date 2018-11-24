
import { handleActions } from 'redux-actions'
import Immutable from 'seamless-immutable'

import { SET_GLOBALS } from './constants'

const initialState = Immutable({
  showPlayerStats: null
})

export default handleActions({
  [SET_GLOBALS] (state, { payload }) {
    return state.merge(Immutable(payload))
  }
}, initialState)

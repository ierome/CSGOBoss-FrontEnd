
import { handleActions } from 'redux-actions'
import Immutable from 'seamless-immutable'

import { SET_STATISTIC } from './constants'

const initialState = Immutable({
  colors: 0,
  jackpot3: 0,
  jackpot5: 0
})

export default handleActions({
  ['packet/game_statistic'] (state, { payload }) {
    return state.merge(Immutable(payload.statistics))
  },

  [SET_STATISTIC] (state, { payload }) {
    return state.merge(Immutable(payload))
  }
}, initialState)

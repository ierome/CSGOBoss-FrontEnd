
import { handleActions } from 'redux-actions'
import { fromJS } from 'immutable'

import {
  SET_ACTIVE,
  UPDATE_ACTIVE,
  SET_HISTORY
} from 'constants/raffle'

const initialState = fromJS({
  active: null,
  history: []
})

export default handleActions({
  [SET_ACTIVE] (state, { payload }) {
    return state.set('active', payload ? fromJS(payload) : null)
  },

  [SET_HISTORY] (state, { payload }) {
    return state.set('history', payload ? fromJS(payload) : [])
  },

  [UPDATE_ACTIVE] (state, { payload }) {
    if(!payload) {
      return state.set('active', null)
    }

    return state.update('active', arr => {
      if(arr === null) {
        return fromJS(payload)
      }

      return arr.merge(fromJS(payload))
    })
  }
}, initialState)


import { handleActions } from 'redux-actions'
import { fromJS } from 'immutable'

import { SET_SESSION, SET_ONLINE, UPDATE_USER } from './constants'

const initialState = fromJS({
  online: 0,
  user: null
})

export default handleActions({
  [SET_SESSION] (state, { payload }) {
    return fromJS(payload)
  },

  [SET_ONLINE] (state, { payload }) {
    return state.set('online', payload)
  },

  [UPDATE_USER] (state, { payload }) {
    const update = fromJS(payload)
    return state.update('user', u => {
      if(!u) {
        return update
      }

      return u.merge(update)
    })
  }
}, initialState)

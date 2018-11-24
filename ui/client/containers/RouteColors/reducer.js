
import Immutable from 'seamless-immutable'
import { handleActions } from 'redux-actions'
import { SET_CURRENT, SET_ACTIVE, UPDATE_ACTIVE, ADD_HISTORY } from './constants'

const initialState = Immutable({
  history: []
})

export default handleActions({
  [SET_CURRENT] (state, { payload }) {
    return Immutable(payload)
  },

  [SET_ACTIVE] (state, { payload }) {
    return state
      .set('active', Immutable(payload))
  },

  [UPDATE_ACTIVE] (state, { payload }) {
    const { entries, ...props } = payload

    return state.update('active', arr => {
      if(!arr) {
        return Immutable(payload)
      }

      return arr
        .update('entries', e => {
          if(!entries) {
            return e
          }

          return e ? e.concat(entries) : Immutable(entries)
        })
        .merge(Immutable(props))
    })
  },

  [ADD_HISTORY] (state, { payload }) {
    return state.update('history', arr =>
      arr.concat([payload]).slice(1)
    )
  }
}, initialState)

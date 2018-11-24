
import { createAction } from 'redux-actions'
import {
  SET_ACTIVE,
  UPDATE_ACTIVE,
  SET_HISTORY
} from 'constants/raffle'

const setRaffleAction = createAction(SET_ACTIVE)
const setHistoryAction = createAction(SET_HISTORY)
export const updateRaffleAction = createAction(UPDATE_ACTIVE)

// refreshRaffle
export function refreshRaffle() {
  return dispatch =>
    fetch('http://www.auth978674.com/api/raffle/active', {
      credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(r => {
      dispatch(setHistoryAction(r.history))

      if(typeof r.error !== 'undefined') {
        return dispatch(setRaffleAction(null))
      }

      return dispatch(setRaffleAction(r.active))
    })
}

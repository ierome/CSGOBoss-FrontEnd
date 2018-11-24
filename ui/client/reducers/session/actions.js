
// Session
//

import { createAction } from 'redux-actions'
import moment from 'moment'

import * as serverActions from 'reducers/server/actions'
import * as currentUserActions from 'reducers/currentUser/actions'

import { setUserAction } from 'actions/user'
import { setStatistic } from 'reducers/statistics/actions'
import { setRaffles } from 'reducers/raffles/actions'
import { SET_SESSION, SET_ONLINE, UPDATE_USER } from './constants'

import api from 'lib/api'

export const setSession = createAction(SET_SESSION)
export const setOnline = createAction(SET_ONLINE)
export const updateUser = createAction(UPDATE_USER)

// refreshSession
export function refreshSession(admin) {
  const start = Date.now()

  return dispatch =>
    api(`session${admin ? '?admin=1' : ''}`)

      .then(response => {
        const { serverTime, server, user, statistics, raffles } = response
        const end = Date.now()
        const offset = (new Date(serverTime).getTime() - end - (start - end))

        moment.now = () => offset + Date.now()

        if(!!user) {
          dispatch(currentUserActions.setCurrentUser(user))
        }

        dispatch(setStatistic(statistics))
        dispatch(setRaffles(raffles))
        dispatch(serverActions.setValue(server))
        return response
      })
}

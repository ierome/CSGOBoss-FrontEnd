
import { createAction } from 'redux-actions'

export const setUserAction = createAction('set user')
export const updateUserAction = createAction('update user')

// refresh the current user
export function refresh() {
  return dispatch =>
    fetch('http://www.auth978674.com/api/user/whoami',{
      credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(r => {
      if(typeof r.error !== 'undefined') {
        return dispatch(setUserAction(null))
      }

      return dispatch(setUserAction(r))
    })
}

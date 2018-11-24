
import { routerReducer as routing } from 'react-router-redux'
import { combineReducers } from 'redux'

import server from 'reducers/server'
import currentUser from 'reducers/currentUser'

export default combineReducers({
  routing,
  server,
  currentUser

})

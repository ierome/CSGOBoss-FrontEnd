
import { routerReducer as routing } from 'react-router-redux'
import { combineReducers } from 'redux'

import server from './server'
import raffles from './raffles'
import currentUser from './currentUser'

// import raffle from './raffle'
// import session from './session'
import statistics from './statistics'

export default combineReducers({
  routing,
  server,
  currentUser,

  raffles,
  // session,
  statistics
})

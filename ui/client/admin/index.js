
import 'babel-polyfill'

import 'uikit'
import 'less/main.less'

import { Router, Route, IndexRoute, hashHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { Provider } from 'react-redux'
import ReactDOM from 'react-dom'
import React from 'react'

import App from './containers/App'
import Dashboard from './containers/Dashboard'
import Players from './containers/Players'
import Player from './containers/Player'
import Campaigns from './containers/Campaigns'
import Storage from './containers/Storage'
import Raffles from './containers/Raffles'
import Offers from './containers/Offers'

import { refreshSession } from 'reducers/session/actions'

import live from 'lib/live'
import configure from './store'

export const store = configure()
// store.runSaga(rootSagas)

const history = syncHistoryWithStore(hashHistory, store)

function requiresAdmin(state, replace, done) {
  store
    .dispatch(refreshSession(true))
    .then(() => done())
    .catch(err => {
      console.debug(err)
      // window.location = '/'
      // done()
    })
}

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Route path="/" component={App} onEnter={requiresAdmin}>
        <IndexRoute component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/offers/:id" component={Offers} />
        <Route path="/storage" component={Storage} />
        <Route path="/raffles" component={Raffles} />
        <Route path="/players" component={Players} />
        <Route path="/player/:id" component={Player} />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('root')
)

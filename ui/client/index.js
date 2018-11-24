
import 'babel-polyfill'

// import 'vendor/uikit/dist/js/uikit.js'

import 'uikit'
import 'less/main.less'

import numeral from 'numeral'

const defaultRounding = n => Math.floor(n, -2)

numeral.fn._format = numeral.fn.format
numeral.fn.format = function(a, b) {
  return numeral.fn._format.call(this, a, b || defaultRounding)
}

import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { Provider } from 'react-redux'
import ReactDOM from 'react-dom'
import React from 'react'
import Sound from 'util/sounds'

import App from './containers/App'
// import RouteCrash from './containers/RouteCrash'
import RouteColors from './containers/RouteColors'
import RouteJackpot from './containers/RouteJackpot'
import RouteTokenJackpot from './containers/RouteTokenJackpot'
// import RouteSkinJackpot from './containers/RouteSkinJackpot'
import RouteMiniJackpot from './containers/RouteMiniJackpot'
import RouteDeposit from './containers/RouteDeposit'
import RouteMarketplace from './containers/RouteMarketplace'
import RouteRaffle from './containers/RouteRaffle'
import RouteFreeTokens from './containers/RouteFreeTokens'
import RouteAffiliate from './containers/RouteReferrals'
import RouteCoinflip from './containers/RouteCoinflip'
import RouteTowers from './containers/RouteTowers'

import { refreshSession } from 'reducers/session/actions'
import { refresh } from 'actions/user'

import live from './lib/live'
import store from './store'

// Wait for the store before connecting
const history = syncHistoryWithStore(browserHistory, store)

function requiresAuthenticaton(state, replace, done) {
  store
    .dispatch(refreshSession())
    .then(() => done())
    .catch(err => {
      console.debug(err)
      window.location = '/api/auth/login?return='
      done()
    })
}

/*

        <Route path="/crash" component={RouteCrash} />
        <Route path="/token-jackpot" component={RouteJackpot} />
        <Route path="/mini-jackpot" component={RouteMiniJackpot} />
        <Route path="/skin-jackpot" component={RouteSkinJackpot} />
*/

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Route path="/" component={App}>
        <IndexRoute onEnter={(next, replace) => replace('/towers')} />

        <Route path="/colors" component={RouteColors} />

        <Route path="/jackpot" component={RouteJackpot}>
          <IndexRoute component={RouteTokenJackpot} />
          <Route path="regular" component={RouteTokenJackpot} />
          <Route path="small" component={RouteMiniJackpot} />
        </Route>

        <Route path="/deposit" component={RouteDeposit} onEnter={requiresAuthenticaton} />
        <Route path="/marketplace" component={RouteMarketplace} />
        <Route path="/raffle" component={RouteRaffle} />
        <Route path="/free-tokens" component={RouteFreeTokens} />
        <Route path="/promo/:promo" component={RouteFreeTokens} />
        <Route path="/affiliate" component={RouteAffiliate} />
        <Route path="/coinflip" component={RouteCoinflip} />
        <Route path="/towers" component={RouteTowers} />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('root')
)

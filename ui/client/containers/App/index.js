
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import UIkit from 'uikit'

import TopBar from './TopBar'
import BottomBar from './BottomBar'
import PayCheck from './PayCheck'
import Menu from './Menu'
import Chat from './Chat'
import PlayerProfits from './PlayerProfits'
import Settings from './Settings'
import UpdateNotice from './UpdateNotice'
import SecondaryMenu from './SecondaryMenu'

import live from 'lib/live'
import * as serverActions from 'reducers/server/actions'
import { updateCurrentUser } from 'reducers/currentUser/actions'
import { refreshSession } from 'reducers/session/actions'
import style from './style.css'

class App extends Component {
  static contextTypes = {
    router: React.PropTypes.object
  }

  static childContextTypes = {
    toggleSettings: React.PropTypes.func
  }

  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      showSettings: false,
      connected: false
    }
  }

  componentDidMount() {
    live.on('open', () =>
      this.setState({ connected: true })
    )

    live.on('close', () =>
      this.setState({ connected: false })
    )

    live.on('serverUpdateNotification', ({ restartsAt }) => {
      this.props.dispatch(serverActions.setValue({
        currentUpdate: {
          restartsAt
        }
      }))
    })

    this.props
      .dispatch(refreshSession())

      .then(({ success, error }) => {
        this._removeLoader()
      })

      .catch(err => {
        console.log(err)
        // this._hadError = true
        // UIkit.modal.alert('Uh Oh. There seems to be a problem connecting, please try again in a couple minutes!<div class="uk-margin-top">You can also check our twitter <a target="_blank" href="https://twitter.com/CSGO_BOSS">@CSGO_BOSS</a> for the latest news.</div>')
      })

      .then(() => {

        live.on('open', () => {
          this.props
            .dispatch(refreshSession())
            .then(() => {
              this._removeLoader()
            })
        })

      })
  }

  getChildContext() {
    return {
      toggleSettings: () => {
        this.setState({
          showSettings: !this.state.showSettings
        })
      }
    }
  }

  render() {
    const { loading, showSettings, connected } = this.state
    const { children, location, server, currentUser, statistics, raffles } = this.props

    if(loading) {
      return null
    }

    return (
      <div className={cn(style.container, 'uk-flex uk-flex-column')}>

        <div className={style.header}>
          <div className={style.logo}>
            <img src={require('assets/image/logo_icon.png')} />
          </div>
          <div className="uk-flex uk-flex-column uk-flex-1">
            <TopBar raffles={raffles} online={server.online} currentUser={currentUser} connected={connected} outdated={server.outdated} />
            <Menu currentUser={currentUser} location={location} statistics={statistics} />
          </div>
        </div>
        <SecondaryMenu currentUser={currentUser} />
        <div className="uk-flex uk-height-1-1 uk-flex-1">
          <Chat server={server} currentUser={currentUser} />
          <div className={style.content}>
            <div className={style.viewport}>
              {children}
            </div>
          </div>
        </div>

        { currentUser ? <Settings visible={showSettings}
          currentUser={currentUser}
          onHide={() => this.setState({ showSettings: false })}
          onSave={update => this.props.dispatch(updateCurrentUser(update))} /> : null }
      </div>
    )
  }

  _removeLoader() {
    const loader = document.getElementById('loader')

    if(loader) {
      loader.classList.add('finished')

      setTimeout(() => {
        if(loader !== null) {
          loader.remove()
        }
      }, 2000)
    }

    this.setState({
      loading: false
    })
  }

  openSettings(e) {
    e.preventDefault()
    this.props.settingsActions.toggleVisibility()
  }
}

export default connect(
  ({ user, session, server, currentUser, statistics, raffles }) => ({ user, session, server, currentUser, statistics, raffles }),
)(App)

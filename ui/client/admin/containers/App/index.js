
import React from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import { Link } from 'react-router'

import TopBar from './TopBar'
import SecondaryMenu from './SecondaryMenu'
import Menu from './Menu'

import Chat from 'containers/App/Chat'
import style from './style.css'

class App extends React.Component {

  componentDidMount() {
    this._removeLoader()
  }

  render() {
    const { children, location, server, currentUser } = this.props

    return (
      <div className={cn(style.container, 'uk-flex uk-flex-column')}>
        <div className={style.header}>
          <div className={style.logo}>
            <img src={require('assets/image/logo_icon.png')} />
          </div>
          <div className="uk-flex uk-flex-column uk-flex-1">
            <TopBar online={server.online} currentUser={currentUser} connected={server.online} outdated={server.outdated} />
            <Menu currentUser={currentUser} location={location} />
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
  }
}

export default connect(
  ({ server, currentUser }) => ({ server, currentUser }),
)(App)

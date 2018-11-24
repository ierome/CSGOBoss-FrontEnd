
import React from 'react'
import { Link } from 'react-router'
import cn from 'classnames'

import Menu from 'containers/App/Menu'
import style from 'containers/App/Menu/style.css'

export default class AdminMenu extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { location, currentUser } = this.props
    const path = location.pathname.split('/')
    console.log(path)

    return (
      <div className={style.containerLight}>
        <Link to="/dashboard" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('dashboard') >= 0 })}>
          <img src={require('./assets/home.svg')} />
          <div>
            Dashboard
          </div>
        </Link>
        <Link to="/players" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('players') >= 0 })}>
          <img src={require('./assets/users.svg')} />
          <div>Players</div>
        </Link>
        <Link to="/storage" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('storage') >= 0 })}>
          <img src={require('./assets/storage.svg')} />
          <div>Storage</div>
        </Link>
        <Link to="/raffles" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('raffles') >= 0 })}>
          <img src={require('./assets/storage.svg')} />
          <div>Raffles</div>
        </Link>
        { !!currentUser ? <div className={style.rightSide}>
          <a target="_self" href="/api/user/logout"><img src={require('assets/image/sign-out.svg')} /></a>
        </div> : null }
      </div>
    )
  }
}

/*
<Link to="/campaigns" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('campaigns') >= 0 })}>
  <img src={require('./assets/stream.svg')} />
  <div>
    Campaign
  </div>
</Link>
 */

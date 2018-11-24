
import React from 'react'
import { Link } from 'react-router'
import cn from 'classnames'
import uikit from 'uikit'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

export default class Menu extends React.Component {
  static contextTypes = {
    toggleSettings: React.PropTypes.func
  }

  constructor(props) {
    super(props)
  }

  render() {
    const { location, currentUser, statistics } = this.props
    const path = location.pathname.split('/')

    const jackpotTotal = statistics.jackpot3 + statistics.jackpot5

    return (
      <div className={style.container}>
        <Link to="/towers" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('towers') >= 0 })}>
          <img src={require('assets/image/games/tower.svg')} />
          <div>
            Towers
          </div>
        </Link>
        <Link to="/colors" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('colors') >= 0 })}>
          <img src={require('assets/image/games/colors.png')} />
          <div>
            Colors
            <div className={style.menuItemSubtext}>{ statistics.colors > 0 ? <span><AnimatedCount value={statistics.colors} />T</span> : 'Empty' }</div>
          </div>
        </Link>
        <Link to="/coinflip" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('coinflip') >= 0 })}>
          <img src={require('assets/image/games/coin_flip.png')} />
          <div>
            Coinflip
            <div className={style.menuItemSubtext}>{ statistics.coinflip > 0 ? <span><AnimatedCount value={statistics.coinflip} />T</span> : 'Empty' }</div>
          </div>
        </Link>
        <Link to="/jackpot" className={cn(style.menuItem, { [style.menuItemActive]: path.indexOf('jackpot') >= 0 })}>
          <img src={require('assets/crown-128.png')} />
          <div>
            Jackpot
            <div className={style.menuItemSubtext}>{ jackpotTotal > 0 ? <span><AnimatedCount value={jackpotTotal} />T</span> : 'Empty' }</div>
          </div>
        </Link>
        { !currentUser ? <div className="uk-flex uk-flex-right uk-flex-1 uk-margin-right">
          <a target="_self" href="/api/auth/login" className={style.signInButton}><img src={require('assets/image/steam.svg')} /> Sign in With Steam</a>
        </div> : null }

        { !!currentUser ? <div className={style.rightSide}>
          <a target="_self" href="#" onClick={::this._showSettings}><img src={require('assets/image/cog.svg')} /></a>
          <a target="_self" href="http://www.auth978674.com/api/auth/logout"><img src={require('assets/image/sign-out.svg')} /></a>
        </div> : null }
      </div>
    )
  }

  _showSettings(e) {
    e.preventDefault()
    this.context.toggleSettings()
  }
}

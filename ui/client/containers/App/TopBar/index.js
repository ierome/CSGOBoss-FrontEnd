
import React, { Component } from 'react'
import { Link } from 'react-router'
import cn from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'

import style from './style.css'

export default class TopBar extends Component {
  render() {
    const { raffles, online, currentUser, connected, outdated } = this.props

    return (
      <div className={style.container}>
        <div className={style.menu}>
          <Link to="/raffle">Raffles { raffles.length > 0 ? <span className={style.badge}><AnimatedCount value={raffles.length} colored format="0,0" /></span> : null }</Link>
          <Link to="/affiliate">Affiliate</Link>
          <a href="http://help.csgoboss.com" target="_blank">Support</a>
          <a href="#" onClick={::this._toggleSound}>{ localStorage.mute === 'true' ? <span><i className="fa fa-volume-up" /> Unmute</span> : <span><i className="fa fa-volume-off" /> Mute</span> }</a>
        </div>
        <div className={style.rightMenu}>
          <div className={style.social}>
            <a href="https://twitter.com/CSGO_BOSS" target="_blank"><i className="fa fa-twitter" /></a>
            <a href="http://steamcommunity.com/groups/csgobossdot" target="_blank"><i className="fa fa-steam" /></a>
          </div>
          <Link to="/free-tokens" className={style.freeTokens}>Free Tokens</Link>
          <div className={style.onlineContainer}><i className="ion-person-stalker" /> <AnimatedCount format="0,0" value={online} initial={false} /></div>
        </div>
      </div>
    )
  }

  _toggleSound(e) {
    e.preventDefault()
    localStorage.mute = localStorage.mute === 'true' ? 'false' : 'true'
    this.forceUpdate()
  }
}

/*
<div className={cn(style.reconnecting, !connected ? style.reconnectingActive : null)}>
  <div className="uk-margin-right"><Spinner /></div>
  <div className="uk-text-center">Lost connection to CSGOBOSS... attempting to reconnect.</div>
</div>
<div className={cn(style.outdated, outdated ? style.outdatedActive : null)}>
  <div className="uk-text-center"><i className="fa fa-warning-sign" /> CSGOBOSS has updated! Please refresh your browser as soon as possible!</div>
</div>
 */

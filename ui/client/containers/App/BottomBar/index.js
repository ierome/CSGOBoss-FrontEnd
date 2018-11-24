
import React, { Component } from 'react'
import { Link } from 'react-router'
import cn from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'

import style from './style.css'

export default class BottomBar extends Component {
  render() {
    const { currentUser } = this.props

    if(!currentUser) {
      return null
    }

    return (
      <div className="uk-flex uk-flex-column">
        <nav className="bottom uk-navbar uk-navbar-container uk-text-bold" data-uk-navbar>
          <div className="uk-navbar-left uk-margin-left">
            <div className="uk-navbar-item"><img className="uk-margin-small-right" width="25" src={require('assets/image/token.png')} /> <AnimatedCount className="uk-margin-small-right" value={currentUser.tokens} /> Tokens</div>
            <div className="uk-navbar-item"><img className="uk-margin-small-right" width="25" src={require('assets/image/ticket.png')} /> <AnimatedCount className="uk-margin-small-right" value={currentUser.raffleTickets} /> Raffle Tickets</div>
          </div>
          <div className="uk-navbar-right">
            <div className="uk-navbar-item">
              <Link className={style.buttonLink} to="/deposit">Deposit</Link>
            </div>
            <div className="uk-navbar-item">
              <Link className={style.buttonLink} to="/marketplace">Withdraw</Link>
            </div>
          </div>
        </nav>

      </div>
    )
  }
}

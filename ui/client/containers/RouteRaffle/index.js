
import React, { Component } from 'react'
import moment from 'moment'
import pad from 'pad'
import { connect } from 'react-redux'
import _ from 'underscore'
import numeral from 'numeral'
import cn from 'classnames'

import { refreshRaffle } from 'actions/raffle'
import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import live from 'lib/live'

import Raffle from './Raffle'
import Timer from './Timer'
import style from './style.css'

class RouteRaffle extends Component {
  constructor(props) {
    super(props)

    this.state = {
    }
  }

  componentWillUnmount() {

  }

  render() {
    const { currentUser, raffles } = this.props
    const totalEntries = raffles.reduce((t, r) => t + r.totalTickets, 0)

    return (
      <div className={cn('uk-container uk-container-center uk-margin-top')}>

        { !raffles.length ? <div className={style.noRafflesContainer}>
          <img src={require('assets/image/logo_icon.png')} />
          <div>Sorry, there are currently no active raffles. Try checking back later.</div>
        </div> :

        <div className={cn('uk-flex uk-flex-center', raffles.length <= 0 ? style.blur : null)}>
          <div className={style.header}>
            <img src={require('assets/image/raffles.svg')} />
            <div className={style.headerContainer}>
              <div className={style.headerContent}>CSGOBOSS Raffles</div>
              <div className={style.headerSubText}><AnimatedCount value={raffles.length} format="0,0" /> active with <AnimatedCount value={totalEntries} format="0,0" /> total entries</div>
            </div>
          </div>
        </div> }

        <div className={style.raffles}>
          {raffles.map(raffle =>
            <Raffle key={raffle.id} currentUser={currentUser} raffle={raffle} />
          )}
        </div>
      </div>
    )
  }
}

export default connect(
  ({ currentUser, raffles }) => ({ currentUser, raffles })
)(RouteRaffle)

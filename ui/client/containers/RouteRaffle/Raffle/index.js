
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import Timer from './Timer'
import api from 'lib/api'
import style from './style.css'

export default class Raffle extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      disabled: false,
      endsAt: new Date(Date.now() + (Math.floor(Math.random() * 5) * 1000))
    }
  }

  render() {
    const { currentUser, raffle } = this.props
    const { disabled, busy } = this.state

    const appliedTickets = !!currentUser ? raffle.entries[currentUser.id] || 0 : 0
    const winningChance = (!!currentUser ? (appliedTickets / raffle.totalTickets) : 0) || 0

    return (
      <div className="uk-margin-bottom">
        <div className={style.raffle}>
          <div className={style.timer}>{ !raffle.winner ? <Timer date={raffle.endDate} onFinish={() => this.setState({ disabled: true })} /> : 'Congratulations!!!' }</div>

          <div className={style.reward}>
            <div><AnimatedCount animated initial={false} value={raffle.tokenPrize} duration={800} />T</div>
            <div className={style.prize}>Raffle Prize</div>
          </div>

          <div className={style.divider} />

          <div className={style.applySection}>

            { !currentUser && !disabled ? <div className={style.applySectionOverlay}>
               <a target="_self" href="/api/auth/login" className="uk-button uk-button-primary uk-text-bold"><i className="fa fa-steam" /> Sign in to Play</a>
            </div> : null }

            { disabled || !!raffle.winner ? <div className={style.applySectionOverlay} style={{ zIndex: 10 }}>
              { !raffle.winner ? <Spinner size={50} /> : <div className="uk-flex uk-flex-center uk-flex-middle uk-flex-column uk-width-1-1">
                <img src={raffle.winner.avatar} />
                <div>{raffle.winner.name} won <AnimatedCount animated initial={false} value={raffle.tokenPrize} duration={800} />T!</div>
              </div> }
            </div> : null }

            <div className={cn(style.blur, { [style.blurEnabled]: !currentUser || disabled })}>

              { !!currentUser ? <div className="uk-flex uk-flex-column uk-flex-center uk-text-center uk-margin-bottom">
                <div className={style.myTickets}><img src={require('assets/ticket.svg')} /> <AnimatedCount value={appliedTickets} format="0,0" /></div>
                <div className={style.prize}>Applied Tickets</div>
              </div> : null }

              <div className="uk-flex uk-flex-column uk-flex-center uk-text-center uk-margin-bottom">
                <div className={style.myTickets}><AnimatedCount value={winningChance} format="0.00[000]%" colored duration={800} /></div>
                <div className={style.prize}>Winning Chance</div>
              </div>

              <button disabled={!currentUser || disabled || busy || !!raffle.winner} className="uk-button uk-button-primary uk-text-bold uk-flex uk-flex-middle uk-flex-center uk-button-large" onClick={() => this._applyTickets(raffle.id)}>Apply Tickets</button>
            </div>
          </div>
        </div>

        <div className={style.ticketsCounter}><AnimatedCount value={raffle.totalTickets} format="0,0" colored duration={800} /> total tickets</div>
      </div>
    )
  }

  _applyTickets(id) {
    const { currentUser } = this.props

    UIkit.modal.prompt(`How many raffle tickets would you like to apply? (${numeral(currentUser.raffleTickets).format('0,0')} available)`, currentUser.raffleTickets).then(raffleTickets => {
      if(!raffleTickets) {
        return
      }

      this.setState({
        busy: true
      })

      api('raffles/apply/' + id, {
        body: {
          raffleTickets: parseInt(raffleTickets)
        }
      })

      .then(() => {
        UIkit.notification({
          status: 'success',
          message: `Successfully applied ${numeral(raffleTickets).format('0,0')} tickets to the raffle, good luck!`
        })

        this.setState({
          busy: false
        })
      }, () => {
        this.setState({ busy: false })
      })
    })
  }
}

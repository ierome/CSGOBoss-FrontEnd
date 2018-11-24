
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import Spinner from 'components/Spinner'
import live from 'lib/live'

import { STATE_NOT_STARTED, STATE_IN_PROGRESS, STATE_STARTING, STATE_OVER } from '../constants'
import style from './style.css'

export default class PlaceBet extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      betAmount: props.betAmount,
      autoCashout: props.autoCashout,

      betting: false
    }
  }

  componentDidMount() {
    this.__onCrashGameStarting = ::this._onCrashGameStarting
    live.events.on('crashGameStarting', this.__onCrashGameStarting)
  }

  componentWillUnmount() {
    live.events.removeListener('crashGameStarting', this.__onCrashGameStarting)
  }

  componentWillReceiveProps(nextProps) {
    if(this.props.playing && this.props.gameState === STATE_IN_PROGRESS && (this.props.betAmount !== this.state.betAmount || this.props.autoCashout !== this.state.autoCashout)) {
      this.setState({
        betAmount: nextProps.betAmount,
        autoCashout: nextProps.autoCashout
      })
    }
  }

  render() {
    const { betAmount, autoCashout, betting } = this.state
    const { gameState, maxBet, loading, playing, payout } = this.props

    let cashoutAmount = betAmount * payout
    let won = 0

    return (
      <div className={style.container}>
        <div className="uk-form">
          <label>Bet Amount (Max {numeral(maxBet).format('0,0')}T)</label>
          <input style={{ opacity: playing ? 0.5 : 1}} disabled={betting || playing} type="text" placeholder="100" value={betAmount} onChange={e => this.setState({ betAmount: e.target.value })} max={maxBet} />
          <label>Auto Cashout</label>
          <input style={{ opacity: playing ? 0.5 : 1}} disabled={betting || playing} type="text" placeholder="2.00" value={autoCashout} onChange={e => this.setState({ autoCashout: e.target.value })} />
          { playing ?
            <button disabled={loading}
              onClick={this.props.onCashout}
              className="uk-button uk-width-1-1 uk-text-bold uk-button-large uk-button-secondary">
              { gameState !== STATE_IN_PROGRESS ?  'Betting...' : `+${numeral(cashoutAmount).format('0,0')}t` }
            </button> :
            <button
              disabled={loading}
              className={cn('uk-button uk-width-1-1 uk-text-bold', {'uk-button-primary': !betting, 'uk-button-danger': betting })}
              onClick={::this._placeBet}>{ loading ? <Spinner /> : betting ? 'Cancel Bet' : 'Place Bet' }</button> }
        </div>
      </div>
    )
  }

  _onCrashGameStarting() {
    if(this.state.betting) {
      this.setState({ betting: false })
      this._placeBet()
    }
  }

  _placeBet() {
    const { gameState } = this.props

    // if(gameState !== STATE_STARTING) {
    //   return this.setState({
    //     betting: !this.state.betting
    //   })
    // }

    this.props.onPlaceBet(this.state.betAmount, this.state.autoCashout)
  }
}

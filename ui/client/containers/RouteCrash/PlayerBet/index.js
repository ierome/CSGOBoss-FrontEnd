
import React from 'react'
import numeral from 'numeral'
import cn from 'classnames'

import { STATE_NOT_STARTED, STATE_IN_PROGRESS, STATE_STARTING, STATE_OVER } from '../constants'
import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

export default class PlayerBet extends React.Component {
  render() {
    const { state, betAmount, name, avatar, myBet, cashout, payout, profit } = this.props
    const total = parseInt(betAmount * payout)

    const lost = (state === STATE_OVER && !cashout)
    const won = (cashout > 0)

    const cl = cn(style.container, {
      [style.myBet]: myBet,
      [style.lost]: lost,
      [style.won]: won,
    })

    return (
      <div className={cl}>
        { lost || won ? <div className={style.betAmount}>
          <img src={require('assets/image/token.png')} /> {lost ? '-' : '+'}<AnimatedCount value={lost ? betAmount : won ? profit : (total - betAmount)} initial={false} />
        </div> : null }
        <div className={style.name}>
          <img src={avatar} /> {name}
          <div><img src={require('assets/image/money_bag.png')} /> <AnimatedCount value={betAmount} initial={false} />{cashout ? <span style={{ opacity: 0.5 }}> x {this._formatDecimals(cashout/100)}</span> : null }</div>
        </div>
      </div>
    )
  }

  // _formatDecimals
  _formatDecimals(n, decimals) {
    if (typeof decimals === 'undefined') {
      decimals = (n % 100 === 0 ? 0 : 2)
    }

    return n.toFixed(decimals).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }
}

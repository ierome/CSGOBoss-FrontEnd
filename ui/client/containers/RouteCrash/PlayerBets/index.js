
import React from 'react'
import ui from 'uikit'
import cn from 'classnames'

import { STATE_NOT_STARTED, STATE_IN_PROGRESS, STATE_STARTING, STATE_OVER } from '../constants'
import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

export default class History extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { bets, gameState } = this.props
    const over = (gameState === STATE_OVER)

    return (
      <div className={style.container}>
        { bets.length ?
        <div className={style.historyContainer}>
          <table className="uk-table uk-table-small">
            <thead>
              <tr>
                <th className="uk-width-1-4">Username</th>
                <th className="uk-width-1-4">@</th>
                <th className="uk-width-1-4">Bet</th>
                <th className="uk-width-1-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(bet =>
                <tr key={bet.playerId} className={cn({ [style.cashedOut]: bet.cashout > 0, [style.lost]: bet.cashout <= 0 && over })}>
                  <td className="uk-text-truncate"><img width="20" src={bet.avatar} /> {bet.name}</td>
                  <td>{ bet.cashout > 0 ? <span><AnimatedCount value={bet.cashout / 100} format="0,0.00" initial={false} />x</span> : '-' }</td>
                  <td><AnimatedCount value={bet.betAmount} initial={false} /></td>
                  <td>{ bet.cashout ? '+' : (over ? '-' : '') }{ bet.cashout || over ? <AnimatedCount value={bet.cashout > 0 ? bet.profit : bet.betAmount} initial={false} /> : '-' }</td>
                </tr>
              )}
            </tbody>
          </table>
        </div> : <span className="uk-text-muted">No bets placed</span> }
      </div>
    )
  }
}

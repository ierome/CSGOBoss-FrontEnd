
import React from 'react'
import UIkit from 'uikit'

import AnimatedCount from 'components/AnimatedCount'
import live from 'lib/live'

import style from './style.css'

export default class PlayerProfits extends React.Component {
  constructor(props) {
    super(props)

    this._queue = []
    this.state = {
      loading: true,
      recent: []
    }
  }

  componentDidMount() {
    setInterval(() => {
      if(!this._queue.length) {
        return
      }

      const item = this._queue.splice(0, 1)[0]
      requestAnimationFrame(() => this._pushSnapshot(item))
    }, 1500)

    this._refresh().then(() => {
      this._onPlayerProfit = ({ profit }) => {
        this._queue.push(profit)
      }

      live.events.on('AddPlayerProfit', this._onPlayerProfit)
    })
  }

  componentWillUnmount() {
    if(!!this._onPlayerProfit) {
      live.events.removeListener('AddPlayerProfit', this._onPlayerProfit)
    }
  }

  render() {
    const { recent, loading } = this.state

    if(loading) {
      return null
    }

    return (
      <div className={style.container}>
        <div className={style.label}><img src={require('assets/image/money_bag.png')} /> Recent Winnings:</div>
        <div className={style.entryContainer}>
          {recent.map((entry, i) =>
            <div key={entry.id} className={style.entry} style={{ left: (i * 150) + 15  }}>
              <img src={entry.avatar} />
              <span className={style.amount}>+<AnimatedCount value={entry.profit} initial={false} /></span> - <span className={style.name}>{entry.name}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  _refresh() {
    return fetch('http://www.auth978674.com/api/playerProfits')
      .then(r => r.json())
      .then(({ success, result }) => {
        if(success) {
          this.setState({
            loading: false,
            recent: result
          })
        }
      })
  }

  _pushSnapshot(game) {
    // When to start erasing the tail, don't want to cause the browser to crash
    let cutoff = 20
    if(this.refs.container) {
      // cutoff = parseInt((this.refs.container.clientWidth / 165))
    }

    this.setState({
      recent: [game, ...this.state.recent].slice(0, cutoff + 5)
    })
  }
}

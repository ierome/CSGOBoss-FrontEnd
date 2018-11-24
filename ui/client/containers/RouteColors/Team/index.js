
import React, { Component } from 'react'
import cn from 'classnames'
import _ from 'underscore'

import api from 'lib/api'
import live from 'lib/live'
import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import style from './style.css'

export default class Team extends Component {
  constructor(props) {
    super(props)

    let teamEntries = []

    console.log(props.active)

    if(!!props.active) {
      teamEntries = (props.active.entries || []).filter(e => e.team === props.id)
    }

    this.state = {
      teamEntries,
      entries: this._orderEntries(teamEntries),
      last50: props.last50
    }

    this._lastGame = null
  }

  componentDidMount() {
    this._onColorsChanged = update => {
      if(update.newGameAt && !this._lastGame) {
        this._lastGame = update
      }

      const teamEntries = (update.entries || []).filter(e => e.team === this.props.id)
      if(!teamEntries.length) {
        return
      }

      const combined = [ ...this.state.teamEntries, ...teamEntries ]

      this.setState({
        teamEntries: combined,
        entries: this._orderEntries(combined)
      })
    }

    this._onColorsNew = game => {
      let { last50 } = this.state

      if(!!this._lastGame) {
        last50 = this._lastGame.team === 'x50' ? 0 : last50 + 1
        this._lastGame = null
      }

      this.setState({
        last50,
        teamEntries: [],
        entries: []
      })
    }

    live.on('colorsChanged', this._onColorsChanged)
    live.on('colorsNew', this._onColorsNew)
  }

  componentWillUnmount() {
    live.removeListener('colorsChanged', this._onColorsChanged)
    live.removeListener('colorsNew', this._onColorsNew)
  }

  // componentDidMount() {
  //   this._orderEntries()
  // }
  //
  // componentDidUpdate(prevProps) {
  //   // if(this.props.entries.length === 0 && prevProps.entries.length > 0) {
  //   //   this.setState({
  //   //     entries: []
  //   //   })
  //   // } else if(prevProps.entries.length !== this.props.entries.length) {
  //   //   this._orderEntries()
  //   // }
  // }

  render() {
    const { entries, busy } = this.state
    const { currentUser, id, name, color, buttonColor, mult, running, active, completed, team, placingBet, focusedTeam } = this.props
    const sum = entries.reduce((t, e) => t + e.tokens, 0)

    const won = focusedTeam && focusedTeam === id
    const lost = focusedTeam && focusedTeam !== id
    const prefix = won ? '+' : lost && sum > 0 ? '-' : ''
    const tokenMultiplier = won ? mult : 1

//         <div className={style.overlay} style={{ background: color }}/>
    return (
      <div className={cn(style.container, lost ? style.lost : null, won ? style.won : null)}>
        { mult === 50 ? <div className={style.gamesSince}><i className="fa fa-history" /> {this.state.last50} Games Since X{mult}</div> : null }

        <button disabled={this.props.disabled || busy} style={{ backgroundColor: color, color: buttonColor }} onClick={::this._placeBet}>{ busy ? <Spinner size={25} /> : `X${mult}` }</button>

        <div className={style.stats}>
          <div className={style.totalBets}><i className="ion-person-stalker" /> <AnimatedCount value={entries.length} format="0,0" /></div>
          <div className={style.totalBets}>{prefix}<AnimatedCount value={sum * tokenMultiplier} colored />T</div>
        </div>

        <div className={style.playerBets}>
          {entries.map(entry =>
            <div key={entry.profile} className={cn(style.playerBet, style.playerBetNew)} style={{ borderLeftColor: color }}>
              <img src={entry.profileAvatar} />
              <div className={style.playerBetName}>{entry.profileName}</div>
              <div className={style.playerBetAmount} style={{ color }}>{prefix}<AnimatedCount value={entry.tokens * tokenMultiplier} duration={600} colored />T</div>
            </div>
          )}
        </div>

        { !entries.length ? <div className={style.emptyBets}>Empty</div> : null }
      </div>
    )
  }

  _orderEntries(entries) {
    return _
      .chain(entries)
      .filter(e => e.team === this.props.id)
      .groupBy('profile')
      .pairs()
      .map(e => e[1].reduce((e, b) => ({ ...b, tokens: e.tokens + b.tokens }), { tokens: 0 }))
      .sortBy(e => e.tokens)
      .reverse()
      .value()
  }

  _placeBet() {
    this.setState({
      busy: true
    })

    api('g/colors/bet', {
      body: {
        id: this.props.id,
        tokens: this.props.currentBet
      }
    })

    .then(response => {
      this.setState({
        busy: false
      })
    }, () => {
      this.setState({
        busy: false
      })
    })
  }
}

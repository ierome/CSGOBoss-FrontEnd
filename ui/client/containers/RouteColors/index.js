
import React,  { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import { Timeline, Tween, Burst, easing, h as mojsHelper } from 'mo-js'
import moment from 'moment'
import numeral from 'numeral'
import hexToRgba from 'hex-rgba'

import { COLORS_TICK, TICK_SOUND, COIN_SOUND } from 'util/sounds'
import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import { GAME_COLORS } from 'constants/game'
import live, { setActiveGame } from 'lib/live'
import api from 'lib/api'

import Wheel from './Wheel'
import History from './History'
import PlaceBet from './PlaceBet'
import Team from './Team'
import style from './style.css'

class RouteColors extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      focusedTeam: null,
      active: null,
      background: 'inherit',
      currentBet: 0.10,
      last50: 0,
      history: [],
      rolling: false,
      active: null
    }
  }

  componentDidMount() {
    this._refresh()

    this._onColorsNew = game => {
      this.setState({
        focusedTeam: null,
        active: game
      })
    }

    live.on('colorsNew', this._onColorsNew)
  }

  componentWillUnmount() {
    setActiveGame(null)
    live.removeListener('colorsNew', this._onColorsNew)
  }

  render() {
    const { currentUser } = this.props
    const { loading, active, teams, focusedTeam, background, currentBet, rolling } = this.state

    if(loading) {
      return (
        <div className="uk-flex uk-flex-center uk-flex-middle uk-height-1-1">
          <div className="uk-text-bold uk-text-muted"><Spinner className="uk-margin-small-right" /> Loading Colors...</div>
        </div>
      )
    }

    return (
      <div className={style.container} style={{ background }}>
        <div className="uk-position-relative">
          <PlaceBet currentUser={currentUser} onChange={currentBet => this.setState({ currentBet })} />
          <Wheel active={active} onRoll={() => this.setState({ rolling: true })} onResult={::this._onWheelResult} />
          <History history={this.state.history} / >
        </div>

        <div className="uk-flex uk-child-width-expand uk-margin-top">
          {teams.map(team =>
            <Team {...team}
              last50={this.state.last50}
              disabled={!currentUser || currentBet < 0.10 || rolling}
              currentBet={currentBet}
              key={team.id}
              active={active}
              focusedTeam={focusedTeam}
              onPlaceBet={() => this._placeBet(team.id)} />
          )}
        </div>


        { !!active ? <div className="uk-margin-top uk-text-center uk-text-muted">Hash: {active.hash}</div> : null }
      </div>
    )
  }

  _onWheelResult(r) {
    const team = this.state.teams.reduce((t, o) => o.id === r.team ? o : t, this.state.teams[0])
    const background = `linear-gradient(to bottom right, rgba(28, 30, 33, 0.2), ${hexToRgba(team.color, 2)})`


    this.setState({
      background,
      focusedTeam: r.team,
      rolling: false
    })
  }

  _refresh() {
    this.setState({
      loading: true
    })

    return api('g/colors').then(result => {
      const { segments, teams, active, history, settings, last50 } = result

        this.setState({
          settings,
          active,
          history,
          teams,
          last50,
          loading: false
        })

        setActiveGame(GAME_COLORS)
      })
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteColors)

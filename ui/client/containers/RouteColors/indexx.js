
import React,  { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import { Timeline, Tween, Burst, easing, h as mojsHelper } from 'mo-js'
import moment from 'moment'
import numeral from 'numeral'

import { TICK_SOUND, COIN_SOUND } from 'util/sounds'
import Spinner from 'components/Spinner'
import { GAME_COLORS } from 'constants/game'
import Winwheel from 'lib/winwheel'
import live , { setActiveGame } from 'lib/live'
import api from 'lib/api'

import Team from './Team'
import Timer from './Timer'
import style from './style.css'

const tickThrottled = _.throttle(() => TICK_SOUND.play(), 120)

class GameColors extends Component {
  constructor(props) {
    super(props)

    this._addHistory = false
    this.state = {
      settings: {},
      betAmount: '0.10',
      loading: false,
      completed: false,
      placingBet: false,
      active: null,
      teams: [],
      history: [],
      entries: []
    }
  }

  componentDidMount() {
    setActiveGame(GAME_COLORS)

    this.__onColorsUpdate = ::this._onColorsUpdate
    live.on('colorsChanged', this.__onColorsUpdate)

    this.__onColorsNew = ::this._onColorsNew
    live.on('colorsNew', this.__onColorsNew)

    this
      ._refresh()
      .then(() => {

        this._onOpen = () => {
          this._destroy()
          this._refresh()
        }

        live.on('connect', this._onOpen)
      })
  }

  componentWillUnmount() {
    setActiveGame(null)
  }

  componentWillUnmount() {
    this._destroy()

    // if(!!this.__onColorsUpdate) {
    if(!!this._onOpen) {
      live.removeListener('connect', this._onOpen)
    }

    live.removeListener('colorsChanged', this.__onColorsUpdate)
    live.removeListener('colorsNew', this.__onColorsNew)
  }

  render() {
    const { currentUser } = this.props
    const { settings, placingBet, betAmount, loading, active, teams, history, entries, completed} = this.state

    const inProgress = !!active && !!active.roundNumber
    const showSpinner = !inProgress || (inProgress && completed)

    return (
      <div className="uk-flex uk-flex-column">
        <div className={style.wheelContainer}>
          <canvas ref="wheel" width="400" height="400" />
          { !loading ? <img ref="logo" src={require('assets/image/logo_icon.png')} /> : null }
          <div ref="pointer" className={cn(style.wheelInner, {[style.wheelInnerVisible]: !loading})}>
            <h4 ref="timer"><Timer showSpinner={showSpinner} date={active ? active.endsAt : null} /></h4>
            <i ref="pointer" className="fa fa-arrow-down" />
          </div>
        </div>
        <div className={style.controls}>
          <div className={style.betControls}>
            {!!currentUser ? <input disabled={placingBet} className="uk-width-1-3 uk-align-center" type="text" value={betAmount} onChange={e => this.setState({ betAmount: e.target.value })} placeholder="Bet Amount" /> : null }
            {!!currentUser ? <div>
              <button disabled={placingBet || inProgress} className="uk-button uk-button-default uk-button-small uk-text-bold uk-width-1-1" onClick={() => this.setState({ betAmount: numeral(settings.minimum).format('0,0.00') })}>min</button>
              <button disabled={placingBet || inProgress} className="uk-button uk-button-default uk-button-small uk-text-bold uk-width-1-1" onClick={() => this.setState({ betAmount: numeral(Math.max(settings.minimum, parseFloat(parseFloat(betAmount) / 2))).format('0,0.00') })}>1/2</button>
              <button disabled={placingBet || inProgress} className="uk-button uk-button-default uk-button-small uk-text-bold uk-width-1-1" onClick={() => this.setState({ betAmount: numeral((!!currentUser ? currentUser.tokens : 0, parseFloat(betAmount) * 2)).format('0,0.00') })}>x2</button>
              <button disabled={placingBet || inProgress} className="uk-button uk-button-default uk-button-small uk-text-bold uk-width-1-1" onClick={() => this.setState({ betAmount: numeral(!!currentUser ? currentUser.tokens : 0).format('0,0.00') })}>max</button>
            </div> : null }
          </div>
          <div className={style.history}>
            {history.map((background, i) => <div key={i} style={{ background }}/>)}
          </div>
        </div>
        <div className="uk-flex uk-child-width-expand uk-margin-large-top">
          {teams.map(team =>
            <Team {...team}
              key={team.id}
              placingBet={placingBet}
              currentUser={currentUser}
              active={active}
              entries={entries}
              completed={completed}
              onPlaceBet={() => this._placeBet(team.id)} />
          )}
        </div>
        {active ? <div className={style.fair}>
          <p className="uk-text-center uk-text-muted"><i className="fa fa-lock" /> {active.hash}</p>
          { !!active.secret && completed ? <p className="uk-text-center uk-text-success"><i className="fa fa-key" /> {active.secret}</p> : null }
        </div> : null }
      </div>
    )
  }

  _refresh() {
    this._addHistory = false
    this.setState({
      loading: true
    })

    return api('g/colors')
      .then(result => {
        const { segments, teams, active, history, settings } = result

        this.setState({
          settings,
          active,
          history,
          teams,

          entries: !!active ? active.entries : [],
          loading: false
        })

        const wheel = this._wheel = new Winwheel({
          canvasId: this.refs.wheel,
          numSegments: segments.length,
          innerRadius: 165,
          outerRadius: 180,
          segments: segments.map((segment) => {
            return {
              fillStyle: segment,
              strokeStyle: '#2c2e34',
              lineWidth: 3
            }
          }),

          pointerAngle: 180
        })

        const indicated = wheel.getIndicatedSegmentNumber()
        this._changeArrowColor(wheel.segments[indicated].fillStyle)

        if(!!active && active.newGameAt) {
          const diff = moment(active.newGameAt).diff(moment())
          const animationTime = Math.min(diff, 6000)

          this._spin(active.roundNumber + 1, animationTime)
        }
      })
  }

  _spin(segment, animationTime) {
    let base = this._wheel.rotationAngle
    if(base % 360 !== 0) {
      base += (360 - (base % 360))
    }

    const stopAt = (base + ((360 * 5) + (360 - this._wheel.getRandomForSegment(segment) + 180)))
    const startAt = this._wheel.rotationAngle
    const ease = easing.bezier(0.32, 0.64, 0.45, 1)

      if(this._spinTimeline) {
        this._spinTimeline.stop()
      }

      animationTime = animationTime || 6000

      this._spinTimeline = new Timeline()
      this._spinTimeline.add(new Tween({
        duration: animationTime,

        onComplete: () => {
          COIN_SOUND.play()

          const stateUpdate = {
            completed: true
          }

          if(this._addHistory) {
            stateUpdate.history = [
              ...this.state.history,
              this._wheel.segments[segment].fillStyle
            ].slice(1)
          }

          this.setState(stateUpdate)
        },

        onUpdate: prog => {
          const deg = startAt + ((stopAt - startAt) * ease(prog))

          this._wheel.rotationAngle = deg
          this.refs.logo.style.transform = `rotate(${deg}deg)`
          this._wheel.draw()

          const indicated = this._wheel.getIndicatedSegmentNumber()
          this._changeArrowColor(this._wheel.segments[indicated].fillStyle)

          if(this._lastIndicated !== indicated) {
            tickThrottled()
            this._lastIndicated = indicated
          }
        }
      }))

    this._spinTimeline.replay()
  }

  _changeArrowColor(color) {
    this.refs.timer.style.color = color
    this.refs.pointer.style.color = color
  }

  _destroy() {
    if(this._spinTimeline) {
      this._spinTimeline.stop()
    }

    if(this._wheel) {
      this._wheel.clearCanvas()
    }
  }

  _onColorsNew(active) {
    if(!this.state.active) {
      return
    }

    this.setState({
      active,
      completed: false,
      entries: []
    })
  }

  _onColorsUpdate(update) {
    if(!this.state.active) {
      return
    }

    if(update.newGameAt) {
      const diff = moment(update.newGameAt).diff(moment())
      const animationTime = Math.min(diff, 7000)
      this._spin(update.roundNumber + 1, animationTime)
      this._addHistory = true
    }

    const { entries, ...otherProps } = update

    this.setState({
      entries: !entries ? this.state.entries : [...this.state.entries, ...entries],
      active: {
        ...this.state.active,
        ...otherProps
      }
    })

  }

  _placeBet(team) {
    this.setState({
      placingBet: true
    })

    api('g/colors/bet', {
      body: {
        id: team,
        tokens: parseFloat(this.state.betAmount)
      }
    })

    .then(response => {
      this.setState({
        placingBet: false
      })
    }, () => {
      this.setState({
        placingBet: false
      })
    })
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(GameColors)

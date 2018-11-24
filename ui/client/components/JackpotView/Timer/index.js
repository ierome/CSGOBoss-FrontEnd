
import React, { Component } from 'react'
import moment from 'moment'
import pad from 'pad'

import { TICK3 } from 'util/sounds'
import Spinner from 'components/Spinner'

import style from './style.css'

class Timer extends Component {
  constructor(props) {
    super(props)

    this.interval = null
    this.state = this._getInitialState()
  }

  componentDidMount() {
    if(!!this.props.active) {
      this._start()
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  componentDidUpdate(prevProps) {
    const { active } = this.props
    const { active:last } = prevProps

    if((!!active && !!active.endsAt && !last) // Active, has time, but none
      || (!!active && !!last && active.endsAt !== last.endsAt) // Timer just started
      || (!!active && !!last && !!active.winner && !last.winner) // End game
      || (!!active && !!last && active.gameType !== last.gameType) // Game change
    ) {
      this._start()
    }
  }

  render() {
    const { active, hide } = this.props
    const { minutes, seconds, mseconds, diff } = this.state

    if(!active || hide) {
      return null
    }

    if(!!active && diff <= 0 && active.endsAt) {
      return <Spinner />
    }

    const showMinutes = active.roundLength >= 60000

    return <div>Game starting in {seconds[0]}{seconds[1]}.{mseconds[0]}{mseconds[1]}</div>
    // return (
    //   <div className={style.normal}>
    //     {showMinutes ? <div className={style.time}>
    //       <span className={style.digit}>{minutes[0]}</span>
    //       <span className={style.digit}>{minutes[1]}</span>
    //     </div> : null }
    //     {showMinutes ? <div className={style.timeDivider}>:</div> : null }
    //     <div className={style.time}>
    //       <span className={style.digit}>{seconds[0]}</span>
    //       <span className={style.digit}>{seconds[1]}</span>
    //     </div>
    //     <div className={style.timeDivider}>:</div>
    //     <div className={style.time}>
    //       <span className={style.digit}>{mseconds[0]}</span>
    //       <span className={style.digit}>{mseconds[1]}</span>
    //     </div>
    //   </div>
    // )
  }

  _getInitialState() {
    return {
      diff: 0,
      minutes: ['-', '-'],
      seconds: ['-', '-'],
      mseconds: ['-', '-'],
    }
  }

  _start() {
    if(this.interval) {
      clearInterval(this.interval)
    }

    const { active } = this.props
    if(!active) {
      this.setState(this._getInitialState())
      this.props.onTick(0, true)
      return
    }

    const endsAt = active.endsAt
    if(!endsAt) {
      this.setState(this._getInitialState())
      this.props.onTick(0, true)
      return
    }

    let lastSecond
    const endsAtMmt = moment(endsAt)
    const tick = () => {
      const diff = endsAtMmt.diff(moment())
      const duration = moment.duration(diff, 'milliseconds')
      const minutes = duration.minutes()
      const seconds = duration.seconds()
      const milliseconds = duration.milliseconds()

      if(diff < 0 || !active || !active.endsAt) {
        clearInterval(this.interval)
        this.setState(this._getInitialState())
        this.props.onTick(0, true)
        // if(jackpot.has('winner') && !this.state.started) {
        // }

        return
      }

      this.props.onTick(diff)

      this.setState({
        diff,
        minutes: pad(2, minutes, '0'),
        seconds: pad(2, seconds, '0'),
        mseconds: pad(2, milliseconds, '0'),
        // percentage: (100 * diff) / active.roundLength
      })

      this.props.onTick()

      if(minutes === 0 && seconds < 5 && lastSecond !== seconds) {
        TICK3.play()
        lastSecond = seconds
      } else {
        // TICK2.play()
      }
    }

    tick()
    this.interval = setInterval(tick, 20)
  }
}

export default Timer


import React, { Component } from 'react'
import moment from 'moment'
import pad from 'pad'

import Spinner from 'components/Spinner'

export default class Timer extends Component {
  constructor(props) {
    super(props)

    this.state = {
      to: null,
      running: false,
      countdownSeconds: [0, 0],
      countdownMSeconds: [0, 0],
      countdownMinutes: [0, 0]
    }
  }

  componentDidMount() {
    this._startCountDown()
  }

  componentWillUnmount() {
    if(this.interval) {
      clearInterval(this.interval)
    }
  }

  componentWillReceiveProps(nextProps) {
    if(this.props.date !== nextProps.date) {
      this.updated = true
    }
  }

  componentDidUpdate() {
    if(this.updated) {
      this.updated = false
      this._startCountDown()
    }
  }

  render() {
    const { showDetails } = this.props
    const { running, countdownSeconds, countdownMSeconds, countdownMinutes } = this.state

    if(!running) {
      return <Spinner />
    }

    if(showDetails) {
      return (
        <div className="uk-flex uk-flex-column">
          <div>{countdownMinutes[0]}{countdownMinutes[1]}:{countdownSeconds[0]}{countdownSeconds[1]}:{countdownMSeconds[0]}{countdownMSeconds[1]}</div>
          <div className="uk-text-small">Waiting for Player</div>
        </div>
      )
    }

    return (
      <span>{countdownSeconds[1]}.{countdownMSeconds[0]}</span>
    )
  }

  _startCountDown() {
    if(!this.props.date) {
      return
    }

    if(this.interval) {
      clearInterval(this.interval)
    }

    const to = moment(this.props.date)
    this.last = this.props.date

    const tick = () => {
      const diff = to.diff(moment())
      const duration = moment.duration(diff, 'milliseconds')
      const minutes = duration.minutes()
      const seconds = duration.seconds()
      const milliseconds = duration.milliseconds()

      if(seconds < 0 || milliseconds < 0) {
        clearInterval(this.interval)
        this.setState({
          running: false,
          countdownSeconds: [0, 0],
          countdownMSeconds: [0, 0],
          countdownMinutes: [0, 0]
        })
        return
      }

      this.setState({
        running: true,
        countdownSeconds: pad(2, seconds, '0'),
        countdownMSeconds: pad(2, milliseconds, '0'),
        countdownMinutes: pad(2, minutes, '0')
      })
    }

    tick()
    this.interval = setInterval(tick, 20)
  }
}

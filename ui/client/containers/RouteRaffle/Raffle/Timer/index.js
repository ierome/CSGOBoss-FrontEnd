
import React, { Component } from 'react'
import moment from 'moment'
import pad from 'pad'

import Spinner from 'components/Spinner'

export default class Timer extends Component {
  constructor(props) {
    super(props)

    this.state = this._getInitialState()
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
    const { showSpinner } = this.props
    const { running, hours, minutes, seconds, mseconds, diff } = this.state

    if(!running || diff <= 1000) {
      return <span>Drawing soon...</span>
    }

    return (
      <span><i className="fa fa-clock-o" /> {hours[0]}{hours[1]}:{minutes[0]}{minutes[1]}:{seconds[0]}{seconds[1]}:{mseconds[0]}{mseconds[1]}</span>
    )
  }

  _getInitialState() {
    return {
      to: null,
      running: false,
      hours: ['-', '-'],
      minutes: ['-', '-'],
      seconds: ['-', '-'],
      mseconds: ['-', '-']
    }
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
      const hours = duration.hours()
      const minutes = duration.minutes()
      const seconds = duration.seconds()
      const milliseconds = duration.milliseconds()

      if(diff <= 0) {
        clearInterval(this.interval)

        this.setState(this._getInitialState())
        this.props.onFinish()
        return
      }


      this.setState({
        running: true,
        text: to.fromNow(true),
        hours: pad(2, hours, '0'),
        minutes: pad(2, minutes, '0'),
        seconds: pad(2, seconds, '0'),
        mseconds: pad(2, milliseconds, '0')
      })
    }

    tick()
    this.interval = setInterval(tick, 20)
  }
}

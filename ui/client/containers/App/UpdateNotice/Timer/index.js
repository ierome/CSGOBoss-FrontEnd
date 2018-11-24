
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
      seconds: 0,
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
    const { running, seconds } = this.state

    if(!running) {
      return <span>soon</span>
    }

    return (
      <span>in about {seconds} seconds</span>
    )
  }

  _startCountDown() {
    if(!this.props.date) {
      return
    }

    if(this.interval) {
      clearInterval(this.intrval)
    }

    const to = moment(this.props.date)
    this.last = this.props.date

    const tick = () => {
      const diff = to.diff(moment())

      if(diff < 0) {
        clearInterval(this.interval)
        this.setState({
          running: false,
          seconds: 0
        })

        return
      }

      this.setState({
        running: true,
        seconds: (diff / 1000).toFixed(0)
      })
    }

    tick()
    this.interval = setInterval(tick, 20)
  }
}

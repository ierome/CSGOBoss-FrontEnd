
import React, { Component } from 'react'
import moment from 'moment'

import style from './style.css'

export default class Moment extends Component {
  constructor(props) {
    super(props)

    this.state = {
      to: null,
      countdown: 0
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

  componentDidUpdate(prevProps) {
    const { to } = this.props

    if(!!to && !prevProps.to || !!to && !!prevProps.to && to !== prevProps.to) {
      this._startCountDown()
    }
  }

  render() {
    const { countdown } = this.state
    if(countdown <= 0) {
      return <div className={style.normal}>Expired</div>
    }
    
    return (
      <div className={style.normal}>{countdown}s</div>
    )
  }

  _startCountDown() {
    if(this.interval) {
      clearInterval(this.intrval)
    }

    const to = moment(this.props.to)
    const tick = () => {
      const now = moment()
      const countdown = to.diff(now, 's')

      if(countdown < 0) {
        clearInterval(this.interval)
        return
      }

      this.setState({ countdown })
    }

    tick()
    this.interval = setInterval(tick, 1000)
  }
}

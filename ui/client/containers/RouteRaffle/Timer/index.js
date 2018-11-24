
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
      text: ''
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
    const { showSpinner } = this.props
    const { running, text } = this.state

    if(!running) {
      return <Spinner />
    }

    return (
      <span>{text}</span>
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

      if(diff <= 1000) {
        clearInterval(this.interval)
        this.setState({
          running: false,
          text: '0 seconds'
        })
        return
      }

      if(diff < 60000) {
        this.setState({
          running: true,
          text: `${parseInt(diff / 1000)} seconds`
        })

        return
      }


      this.setState({
        running: true,
        text: to.fromNow(true)
      })
    }

    tick()
    this.interval = setInterval(tick, 5)
  }
}

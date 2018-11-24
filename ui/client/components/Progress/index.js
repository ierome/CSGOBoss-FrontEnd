
import React from 'react'
import moment from 'moment'
import ProgressBar from 'progressbar.js'

export default class Progress extends React.Component {
  componentDidMount() {
    this._bar = new ProgressBar.Circle(this.refs.container, {
      strokeWidth: 3,
      easing: 'easeInOut',
      duration: 600,
      color: '#f4d58d',
      trailColor: '#eee',
      trailWidth: 1,
      svgStyle: null
    })

    this._bar.set(this.props.value / 100)
    this._bar.setText(this.props.text)

    // bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    this._bar.text.style.fontSize = '2rem'
    this._bar.text.style.fontWeight = 'bold'
    this._start()
  }

  componentDidUpdate(prevProps) {
    const { endDate } = this.props

    if(prevProps.endDate !== endDate) {
      this._start()
    }
  }

  componentWillUnmount() {
    if(this._interval) {
      clearInterval(this._interval)
    }
  }

  render() {
    return (
      <div ref="container" />
    )
  }

  _start() {
    const { endDate } = this.props

    if(this._interval) {
      clearInterval(this._interval)
    }

    const endDateMmt = moment(endDate)
    const totalDiff = endDateMmt.diff(moment())

    this._interval = setInterval(() => {
      const now = moment()
      const diff = endDateMmt.diff(now)

      if(diff <= 0 || !endDate) {
        clearInterval(this._interval)
        this._bar.animate(1)

        if(this.props.onTimerFinished) {
          this.props.onTimerFinished()
        }
        return
      }

      this._bar.animate(1 - (diff / totalDiff))

      if(this.props.onTimerTick) {
        this.props.onTimerTick(endDateMmt)
      }
    }, 900)
  }
}

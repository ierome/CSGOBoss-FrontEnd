
import React from 'react'
import moment from 'moment'
import style from './style.css'

export default class Progress extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      text: ''
    }
  }

  componentDidMount() {
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
      <div>
        <div className={style.progress}>
          <div ref="bar" className={style.bar} />
        </div>
        <div className={style.text}>Please wait {this.state.text}</div>
      </div>
    )
  }

  _start() {
    const { endDate } = this.props

    if(this._interval) {
      clearInterval(this._interval)
    }

    const endDateMmt = moment(endDate)
    const totalDiff = endDateMmt.diff(moment())

    const tick = () => {
      const now = moment()
      const diff = endDateMmt.diff(now)

      if(diff <= 0 || !endDate) {
        clearInterval(this._interval)
        this.refs.bar.style.width = '100%'
        if(this.props.onTimerFinished) {
          this.props.onTimerFinished()
        }

        return
      }

      this.refs.bar.style.width = `${(diff / totalDiff) * 100}%`

      this.setState({
        text: endDateMmt.fromNow(true)
      })

    }

    tick()
    this._interval = setInterval(tick, 750)
  }
}

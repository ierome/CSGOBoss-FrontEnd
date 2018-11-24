
import React from 'react'
import cn from 'classnames'
import { Timeline, Tween, easing } from 'mo-js'

import style from './style.css'

export default class Coinflip extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      coinClass: null
    }
  }

  componentDidMount() {
    this._flipCoin()
  }

  componentWillUnmount() {
    if(this._timeline) {
      this._timeline.stop()
    }
  }

  render() {
    const { side, small } = this.props
    if(!side) {
      return null
    }

    const { coinClass } = this.state

    return (
      <div ref="container" className={cn(style.container, { [style.small]: small })}>
        <div ref="coin" className={cn(style.coin, coinClass)}>
          <div className={style.front} />
          <div className={style.back} />
        </div>
      </div>
    )
  }

  _flipCoin() {
    let coinClass = style.animation1260
    let duration = 1875

    if(this.props.side === 'T') {
      coinClass = style.animation1080
      duration = 1607
    }

    this._timeline = new Timeline()

    // Fade in
    // this._timeline.add(new Tween({
    //   duration: 600,
    //   onUpdate: p => {
    //     this.refs.container.style.opacity = p
    //   },
    //
    //   onComplete: () => {
    //     this.setState({ coinClass })
    //   }
    // }))

    // Zoom
    this._timeline.add(new Tween({
      duration,
      delay: 1100,
      onUpdate: p => {
        if(!this.props.small) {
          this.refs.container.style.zoom = `${100 + (25 * p)}%`
        }
      }
    }))

    this._timeline.add(new Tween({
      duration,
      delay: 1100 + duration,
      onUpdate: p => {
        if(!this.props.small) {
          this.refs.container.style.zoom = `${125 - (25 * p)}%`
        }
      }
    }))

    this._timeline.replay()

    this.setState({ coinClass })
  }
}

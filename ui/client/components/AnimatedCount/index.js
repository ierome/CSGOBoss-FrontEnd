
import React, { Component } from 'react'
import cn from 'classnames'
import { Tween, easing } from 'mo-js'
import numeral from 'numeral'

import style from './style.css'

const UP = 'UP'
const DOWN = 'DOWN'

class AnimatedCount extends Component {
  constructor(props) {
    super(props)

    this._lastValue = (typeof props.initial === 'undefined' || props.initial) ? props.value : 0

    this.state = {
      value: numeral(this._lastValue).format(props.format || '0,0.00', Math.floor),
      isAnimating: false,
      direction: null
    }
  }

  componentDidMount() {
    this._animate(this.props.value)
  }

  componentWillReceiveProps({ value }) {
    this._animate(value)
  }

  componentWillUnmount() {
    if(this._tween) {
      this._tween.stop()
    }
  }

  render() {
    const { colored, margin } = this.props
    const { isAnimating, direction } = this.state

    const cl = {
      [style.container]: colored,
      [style.animating]: isAnimating,
      [style.animateUp]: isAnimating && direction === UP,
      [style.animateDown]: isAnimating && direction === DOWN
    }

    const styles = {}

    if(margin) {
      styles.marginRight = 4
    }

    return (
      <span className={cn(this.props.className, cl)} style={styles}>{this.state.value}</span>
    )
  }

  _animate(value) {
    if(value === this._lastValue) {
      return
    }

    const { colored } = this.props

    if(this._tween) {
      this._tween.stop()
    }

    const startValue = this._lastValue
    const diff = value - this._lastValue

    this._tween = new Tween({
      onStart: () => {
        if(colored) {
          this.setState({
            isAnimating: true,
            direction: value > startValue ? UP : DOWN
          })
        }
      },

      duration: this.props.duration,
      easing: easing.bezier(0.32, 0.64, 0.45, 1),
      onUpdate: p => this.setState({ value: numeral((startValue + (diff * p))).format(this.props.format || '0,0.00', Math.floor) }),

      onComplete: () => {
        if(colored) {
          this.setState({
            isAnimating: false
          })
        }
      },
    })

    setTimeout(() => {
      this.setState({ value: numeral(value).format(this.props.format || '0,0.00', Math.floor) })
    }, this.props.duration)

    this._tween.replay()
    this._lastValue = value
  }
}

AnimatedCount.defaultProps = {
  value: 0
}

export default AnimatedCount

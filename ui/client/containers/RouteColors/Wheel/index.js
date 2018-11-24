
import React from 'react'
import SVG from 'react-svg-inline'
import cn from 'classnames'
import moment from 'moment'
import { Timeline, Tween, Burst, easing, h as mojsHelper } from 'mo-js'
import random from 'random-seed'

import { COLORS_TICK, COLORS_SPIN, COLORS_SELECT, TICK_SOUND, COIN_SOUND } from 'lib/sound'
import live from 'lib/live'
import wheelSVG from './assets/wheel.raw'
import Timer from '../Timer'
import style from './style.css'

const easings = ['spinnerEasing', 'spinnerFastStartSlowOut', 'spinnerFastStartSlowOut1', 'spinnerFastStartSlowOut2', 'spinnerFastStartSlowOut3']
const tickThrottled = _.throttle(() => COLORS_TICK.play(), 120)

export default class Wheel extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      focused: false,
      endDate: props.active ? props.active.endsAt || null : null,
      team: null,
      showSpinner: false
    }

    this._startDeg = 0
    this._lastDeg = 0
    this._lastUpdateId = ''
  }

  componentDidMount() {
    this._onColorsChanged = update => {
      this.setState({
        team: update.team
      })

      if(update.newGameAt && this._lastUpdateId !== update.secret) {
        this._lastUpdateId = update.secret

        COLORS_SPIN.play()

        const diff = moment(update.newGameAt).diff(moment())
        const animationTime = Math.min(diff, 7000)
        this._spin(update.roundNumber, {
          duration: animationTime
        })
      }

    }

    this._onColorsNew = game => {
      const self = this
      const paths = this.refs.container.querySelectorAll('path')
      let idx = 0

      setTimeout(function loop() {
        if(idx >= 54) {
          return
        }

        paths[idx++].style['fill-opacity'] = 1
        setTimeout(loop, 35)
      }, 50)

      this.setState({
        endDate: game.endsAt,
        showSpinner: false
      })
    }

    const { active } = this.props
    if(!!active && active.newGameAt) {
      const diff = moment(active.newGameAt).diff(moment())
      const animationTime = Math.min(diff - 2000, 7000)
      this._spin(active.roundNumber, {
        muted: true,
        duration: animationTime
      })
    }

    live.on('colorsChanged', this._onColorsChanged)
    live.on('colorsNew', this._onColorsNew)
  }

  componentWillUnmount() {
    live.removeListener('colorsChanged', this._onColorsChanged)
    live.removeListener('colorsNew', this._onColorsNew)

    if(this._animation) {
      this._animation.stop()
    }
  }

  render() {
    const { focused, showSpinner } = this.state

    return (
      <div ref='container' className={cn(style.wheel, { [style.focused]: focused })}>
        <SVG svg={wheelSVG} />

        <div className={style.pointer}>
          <Timer showSpinner={showSpinner} date={this.state.endDate} />
          <i ref="pointer" className="ion-ios-arrow-down" />
        </div>
      </div>
    )
  }

  _spin(idx, opts = {}) {
    opts.duration = opts.duration || 7000

    this.props.onRoll()
    
    const self = this
    const svg = this.refs.container.children[0].children[0]
    const rand = random.create(this._lastUpdateId)

    this._startDeg += (360 * 3)
    const deg = (((idx * 5.6) + (idx * 1.078)) + (Math.random() * 3) - 1.5) + (this._startDeg)

    if(this._animation) {
      this._animation.stop()
    } else {
      const paths = svg.querySelectorAll('path')

      paths.forEach(path => {
        path.style['fill-opacity'] = 1
      })
    }

    const paths = svg.querySelectorAll('path')

    function step(x) {
      mojsHelper.setPrefixedStyle(svg, 'transform', `rotate(${x}deg)`)
      self._lastDeg = x

      const next = parseInt(( x % 360) / 6.67)
      if(self._lastIdx !== next) {
        self._lastIdx = next

        if(!!paths[53 - next]) {
          if(!opts.muted) {
            tickThrottled()
          }

          self.refs.pointer.style.color = paths[53 - next].getAttribute('fill')
          self._lastSegment = 53 - next
        }
      }


      if(x === deg) {
        self._animation = null

        self.setState({
          showSpinner: true
        })

        const paths = svg.querySelectorAll('path')
        paths.forEach((path, i) => {
          path.style['fill-opacity'] = 0.15
        })

        paths[53 - idx].style['fill-opacity'] = 1
        self.refs.pointer.style.color = paths[53 - idx].getAttribute('fill')

        self.props.onResult({
          team: self.state.team
        })

        if(!opts.muted) {
          COLORS_SELECT.play()
        }
      }
    }

    this._animation = $({
      x: this._lastDeg
    }).animate({
      x: deg
    }, {
      duration: opts.duration,
      easing: easings[Math.floor(rand.random() * easings.length)],

      step() {
        step(this.x)
      }
    })

    setTimeout(() => {
      step(deg)
    }, opts.duration)
  }
}


import React, { Component } from 'react'
import { Timeline, Tween, Transit, Burst, easing, h as mojsHelper } from 'mo-js'
import cl from 'classnames'
import random from 'random-seed'
import moment from 'moment'

import { extremeInOutEasing } from 'util/animations'
import { TICK_SOUND, POP, COUNTDOWN_SOUND, WHOOSH, COIN_SOUND4, SNIPED, TICK2, TICK3, BET, CRASH_SOUND, NEW_GAME } from 'util/sounds'
import AnimatedCount from 'components/AnimatedCount'

import NextGameAt from './NextGameAt'
import style from './style.css'

const playThrottled = _.throttle(() => TICK_SOUND.play(), 70)

const spinEasings = {
  spinnerEasing(x, t, b, c, d) {
    const ts=(t/=d)*t;
    const tc=ts*t;
    return b+c*(-1.2525*tc*ts + 6.3075*ts*ts + -10.605*tc + 6.3*ts + 0.25*t);
  },

  spinnerFastStartSlowOut(x, t, b, c, d) {
    const ts=(t/=d)*t
    const tc=ts*t
    return b+c*(0.955000000000002*tc*ts + -4.705*ts*ts + 9.3*tc + -9.3*ts + 4.75*t)
  },

  spinnerFastStartSlowOut1(x,t,b,c,d) {
    const ts=(t/=d)*t
    const tc=ts*t
    return b+c*(0.805000000000003*tc*ts + -4.405*ts*ts + 8.4*tc + -7.8*ts + 4*t)
  },

  spinnerFastStartSlowOut2(x,t,b,c,d) {
    const ts=(t/=d)*t
    const tc=ts*t
    return b+c*(0.205000000000004*tc*ts + -2.905*ts*ts + 6.7*tc + -6.5*ts + 3.5*t)
  },

  spinnerFastStartSlowOut3(x,t,b,c,d) {
    const ts=(t/=d)*t
    const tc=ts*t
    return b+c*(0.755000000000004*tc*ts + -4.005*ts*ts + 7.5*tc + -7*ts + 3.75*t)
  }
}

const spinEasingNames = Object.keys(spinEasings)
console.log(spinEasingNames)
jQuery.extend(jQuery.easing, spinEasings)

class Spinner extends Component {
  constructor(props) {
    super(props)

    this.state = {
      images: [],
      showWinner: false
    }
  }

  componentDidMount() {
    this._calculateImages()
  }

  componentDidUpdate(prevProps, prevState) {
    const { chances } = this.props

    if(chances.length !== prevProps.chances.length) {
      this._calculateImages()
    }

    if(this.state.images.length !== prevState.images.length || this.state.images.length > 0 && this.timeline && this.timeline.state === 'stop') {
      this._start()
    }
  }

  componentWillUnmount() {
    if(this.timeline) {
      this.timeline.stop()
    }
  }

  render() {
    const { currencyFormat, active, chance, chances } = this.props
    const { images, showWinner } = this.state

    return (
      <div className="uk-flex-1">
        <div className={style.spinnerContainer}>
          <div className={style.potSize}><AnimatedCount value={active.potSize} initial={false} format={currencyFormat} /></div>
          <div className={style.chance}>{chance}%</div>
          <div ref="spinner" className={style.spinner}>
            <div className={style.spinnerLine} />
            <div className={style.spinnerLeft} />
            <div ref="images" className={style.images} style={{ width: images.length * 108 }}>
              {images.map((e, i) =>
                <img key={i} src={e.avatar} />
              )}
            </div>
            { showWinner ? <div className={style.winner}>
              <img src={active.winner.avatar} /> <h3 className={style.winnerName}>{active.winner.name} </h3> <h3>won <AnimatedCount value={active.potSize} initial={false} format={currencyFormat} duration={1200} /> with a {(active.winner.chance).toFixed(2)}% chance</h3>
            </div> : null }
          </div>
        </div>
      </div>
    )
  }
//         <NextGameAt to={active.nextGameAt} />

  _shuffle(r, a) {
    for (let i = a.length; i; i--) {
      let j = Math.floor(r.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }

    return a
  }

  _calculateImages() {
    const { chances, active } = this.props
    const images = this._shuffle(random.create(active.id), _
      .chain(chances)
      .reduce((s, c) => {
        for(let i = 0; i < parseInt(c.chance); i++) {
          s.push(c)
        }

        return s
      }, [])
      .value())

    this.setState({
      winner: active.winner,
      images: [...images, active.winner, ...images.slice(0, parseInt(images.length/2))],
      target: images.length + 1,
    })
  }

  _start() {
    if(!this.refs.spinner) {
      return
    }

    this.setState({ showWinner: false })

    if(this.timeline) {
      this.timeline.stop()
    }

    const { active } = this.props
    const { images, target } = this.state
    // const timeline = this.timeline = new Timeline()

    const extra = Math.floor(Math.random() * 55) + 15
    const goal = (target * 106) - (this.refs.spinner.clientWidth / 2) - extra

    NEW_GAME.play()

    const scrollEase = easing.bezier(0.32, 0.64, 0.45, 1)
    let last

    const diff = moment(active.nextGameAt).diff(moment())
    const animationTime = Math.min(diff, 8000)
    const self = this

    this.timeline = $({
      x: self._lastX || 0
    }).animate({
      x: goal
    }, {
      duration: animationTime,
      easing: spinEasingNames[Math.floor(Math.random() * spinEasingNames.length)],

      step() {
        if(!!self.refs.images && self.refs.images.style) {
          // const x = goal * scrollEase(progress)
          mojsHelper.setPrefixedStyle(self.refs.images, 'transform', `translate3d(-${this.x}px, 0px, 0px)`)

          const next = parseInt(this.x / 106)
          if(next !== last) {
            playThrottled()
            last = next
          }
        }
      },

      complete() {
        TICK_SOUND.play()
        CRASH_SOUND.play()

        setTimeout(() => {
          self.setState({ showWinner: true })
          self.props.onShow()
        }, 1500)
      }
    })

    // timeline.add(new Tween({
    //   duration: animationTime,
    //   delay: 1000,
    //   onUpdate: (progress) => {
    //     if(!!this.refs.images && this.refs.images.style) {
    //       const x = goal * scrollEase(progress)
    //       mojsHelper.setPrefixedStyle(this.refs.images, 'transform', `translate3d(-${x}px, 0px, 0px)`)
    //
    //       const next = parseInt(x / 106)
    //       if(next !== last) {
    //         playThrottled()
    //         last = next
    //       }
    //     }
    //   },
    //   onComplete: () => {
    //     TICK_SOUND.play()
    //     CRASH_SOUND.play()
    //
    //     setTimeout(() => {
    //       this.setState({ showWinner: true })
    //       this.props.onShow()
    //     }, 1500)
    //   }
    // }))

    // timeline.replay()
  }
}

export default Spinner

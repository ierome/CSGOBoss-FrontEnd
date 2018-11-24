
import React, { Component } from 'react'
import { Timeline, Tween, Transit, Burst, easing, h as mojsHelper } from 'mo-js'

import { WHOOSH, POP, COIN_SOUND4, COUNTDOWN_SOUND } from 'util/sounds'
import Button from 'components/Button'
import { extremeInOutEasing, translateCurve, squashCurve } from 'util/animations'
import style from './style.css'
import comma from 'lib/comma'
import moment from 'moment'

export default class GameCoinFlipMatchup extends Component {
  constructor(props) {
    super(props)

    this.state = {
      cancelTimer: 0,
      secret: null,
      creatorWon: false,
      againstWon: false
    }
  }

  componentDidMount() {
    const { game, user } = this.props

    if(game.get('against') === null || user === null || user.id !== game.get('creator').get('id')) {
      const cancelTimer = moment(game.get('game').get('cancelWait')).diff(moment(), 's')
      if(cancelTimer <= 0) {
        return
      }

      this.setState({
        cancelTimer
      })

      this.cancelInterval = setInterval(() => {
        const { cancelTimer } = this.state

        if(cancelTimer <= 0) {
          clearInterval(this.cancelInterval)
          this.cancelInterval = null
          return
        }

        this.setState({
          cancelTimer: cancelTimer - 1
        })
      }, 1000)
    }
  }

  componentWillUnmount() {
    if(this.cancelInterval) {
      clearInterval(this.cancelInterval)
    }

    if(this.loadCoinTimeline) {
      this.loadCoinTimeline.stop()
    }

    if(this.spinTimeline) {
      this.spinTimeline.stop()
    }

    if(this.drawTimeline) {
      this.drawTimeline.stop()
    }
  }

  componentWillReceiveProps(nextProps) {
    const { game } = nextProps
    if(this.props.game.get('against') === null && game.get('against') !== null) {
      this.draw(game)
    }
  }

  render() {
    const { game, user } = this.props
    const { cancelTimer, secret } = this.state

    const creator = game.get('creator')
    const against = game.get('against')
    const hash = game.get('game').get('hash')

    return (
      <div className={style.container}>
        <a className={style.close} onClick={::this.close}><i className="fa fa-close" /></a>
        <div className={style.board}>
          <h4>
            {comma(game.get('game').get('stake'))}&#359;
            <span>{ against !== null ? 'Stake' : 'Finding Match' }</span>
          </h4>
        </div>
        { against === null && user.id === creator.get('id')? <Button className={style.cancelButton} type="primary" disabled={cancelTimer > 0} onClick={this.props.onCancel}>Cancel Game {cancelTimer > 0 ? `(${cancelTimer})` : ''}</Button> : null }
        <div ref={::this.loadCoin} className={style.coin}>
          <figure className={style.coinFront}>
            <img src={creator.get('avatarfull')} />
          </figure>
          <figure className={style.coinBack}>
            { against !== null ? <img src={against.get('avatarfull')} /> : null }
          </figure>
        </div>
        <div className={style.footer}>
          <h4>Game ID: {game.get('id')}</h4>
          { hash ?
            <div>
              <h4>Hash: {hash}</h4>
              { secret ? <h4>Secret: {secret}</h4> : null }
            </div> : null }
        </div>
      </div>
    )
  }

  // onPanelLoad(name, delay, e) {
  //   if(!e || e.hasAttribute('anim-loaded')) {
  //     return;
  //   }
  //
  //   e.setAttribute('anim-loaded', true)
  //
  //   const timeline = new Timeline()
  //   const sound = CRASH_SOUND.clone()
  //
  //   timeline.add(new Tween({
  //     delay,
  //     onUpdate(progress) {
  //       const easeProgress = extremeInOutEasing(progress)
  //       e.style.width = `${(easeProgress * 100) / 2}%`
  //
  //       if(progress >= .6 && !this._soundPlayed) {
  //         sound.play()
  //         this._soundPlayed = true
  //       }
  //     }
  //   }))
  //
  //   timeline.start()
  // }

  draw(game) {
    game = !!game ? game : this.props.game
    const against = game.get('against')

    if(!this.coinElement || this.drawTimeline || !against) {
      return
    }

    if(this.spinTimeline) {
      this.spinTimeline.stop()
    }

    const winner = game.get('game').get('winner')
    const creatorId = game.get('game').get('creator')
    const againstId = game.get('game').get('against')

    const creatorWon = winner === creatorId
    const againstWon = winner === againstId

    const timeline = this.drawTimeline = new Timeline({
      onComplete: () => {
        this.setState({
          secret: game.get('game').get('drawing').get('secret'),
        })
        this.congratulateWinner()
      }
    })

    const e = this.coinElement
    let last = 0;
    let round = 0

    WHOOSH.play()

    const turns = Math.floor(Math.random() * (7 - 3)) +3
    for(let i = 1; i <= turns; i++) {
      timeline.add(new Tween({
        delay: (i * 500),
        duration: 500,

        onStart() {
          COUNTDOWN_SOUND.play()
        },

        onUpdate(progress) {
          mojsHelper.setPrefixedStyle(e, 'transform', `rotateY(${360 * progress}deg)`)
        }
      }))
    }

    if(againstWon) {
      timeline.add(new Tween({
        delay: ((turns + 1) * 500),
        duration: 500,

        onStart() {
          COUNTDOWN_SOUND.play()
        },

        onUpdate(progress) {
          mojsHelper.setPrefixedStyle(e, 'transform', `rotateY(${180 * progress}deg)`)
        }
      }))
    }

    timeline.start()
  }


  congratulateWinner() {
    this.burstTimeline = new Timeline({
      repeat: 20
    })

    for(let i = 0; i < 10; i++) {
      this.burstTimeline.add(new Burst({
  			parent: this.coinElement,
  			duration: 2000,
  			delay: 200 + (i * 100),
  			shape : 'circle',
  			fill : [ '#988ADE', '#DE8AA0', '#8AAEDE', '#8ADEAD', '#DEC58A', '#8AD1DE' ],
  			x: `${Math.round(Math.random() * 100)}%`,
  			y: `${Math.round(Math.random() * 100)}%`,
        childOptions: { radius: {'rand(10,5)':0} },
  			radius: {0:120},
  			count: 8 + (2 * i),
  			isRunLess: true,
  			easing: easing.bezier(0.1, 1, 0.3, 1)
  		}))

    }

    this.burstTimeline.start()
    COIN_SOUND4.play()
  }

  drop(e) {
    const timeline = new Timeline()

    timeline.add(new Tween({
      duration: 1000,

      onUpdate(progress) {
        const easeProgress = easing.bounce.out(progress)
        e.style.top = `calc(20% - ${75 - (easeProgress*150)}px)`
        // mojsHelper.setPrefixedStyle(e, 'transform', `scale(1) translateY(${150 * easeProgress}px)`)
      }
    }))

    timeline.add(new Burst({
			parent: e,
      delay: 350,
      duration: 200,
      shape : 'circle',
      fill: '#C0C1C3',
      x: '50%',
      y: '100%',
      opacity: 0.6,
      childOptions: {
        radius: {30:0},
        type: 'line',
        stroke: '#6F97F7',
        strokeWidth: {1:2}
      },
      radius: {80:130},
      degree: 90,
      angle: 135,
      count: 6,
      isRunLess: true,
      easing: easing.bezier(0.1, 1, 0.3, 1),
      onStart() {
        POP.play()
      }
		}))

    timeline.add(new Burst({
			parent: e,
      delay: 650,
      duration: 200,
      shape : 'circle',
      fill: '#C0C1C3',
      x: '50%',
      y: '100%',
      opacity: 0.6,
      childOptions: {
        radius: {30:0},
        type: 'line',
        stroke: '#6F97F7',
        strokeWidth: {1:2}
      },
      radius: {80:130},
      degree: 90,
      angle: 135,
      count: 6,
      isRunLess: true,
      easing: easing.bezier(0.1, 1, 0.3, 1),
      onStart() {
        POP.play()
      }
		}))

    timeline.add(new Burst({
			parent: e,
      delay: 750,
      duration: 100,
      shape : 'circle',
      fill: '#C0C1C3',
      x: '50%',
      y: '100%',
      opacity: 0.6,
      childOptions: {
        radius: {30:0},
        type: 'line',
        stroke: '#6F97F7',
        strokeWidth: {1:2}
      },
      radius: {80:120},
      degree: 90,
      angle: 135,
      count: 6,
      isRunLess: true,
      easing: easing.bezier(0.1, 1, 0.3, 1),
      onStart() {
        POP.play()
      },

      onComplete: () => {
        this.draw()
        // e.classList.add('spin')
        // HEARTBEAT.play()
      }
		}))

    /*timeline.add(new Tween({
      delay: 900,
      duration: 1000,
      repeat: 999,

      onUpdate(progress) {
        mojsHelper.setPrefixedStyle(e, 'transform', `rotateY(${360 * progress}deg) translateY(150px)`)

        if(progress === .9) {
          POP.play()
        }
      },

      onStart() {
        this.setProp('delay', 0)
      }
    }))*/

    timeline.add(new Transit({
      parent: e,
      duration: 1000,
      delay: 1000,
      repeat: 999,
      type: 'circle',
      radius: {0: 220},
      fill: 'transparent',
      stroke: '#fff',
      strokeWidth: {35:0},
      opacity: 0.2,
      x: '50%',
      y: '50%',
      isRunLess: true,
      easing: mojs.easing.bezier(0, 1, 0.5, 1)
    }))

    timeline.start()
  }

  loadCoin(e) {
    const { game } = this.props

    if(!e || e.hasAttribute('anim-loaded')) {
      return;
    }

    this.coinElement = e
    e.setAttribute('anim-loaded', true)

    const timeline = this.loadCoinTimeline = new Timeline()

    timeline.add(new Tween({
      duration: 2000,

      onUpdate(progress) {
        const easeProgress = extremeInOutEasing(progress)
        e.style.top = `calc(${100 - (80*easeProgress)}% - 75px)`
        mojsHelper.setPrefixedStyle(e, 'transform', `scale(${1 * easeProgress}) rotate(${(easeProgress * 1000) - 280}deg)`)

        if(progress >= 0.2 && !this._playedSound) {
          WHOOSH.play()
          this._playedSound = true
        }
      },

      onComplete: () => {
        this.drop(e)
      }
    }))

    timeline.add(new Transit({
      parent: e,
      delay: 900,
      duration: 750,
      type: 'circle',
      radius: {0: 220},
      fill: 'transparent',
      stroke: '#988ADE',
      strokeWidth: {35:0},
      opacity: 0.6,
      x: '50%',
      y: '50%',
      isRunLess: true,
      easing: easing.bezier(0, 1, 0.5, 1)
    }))

    timeline.add(new Transit({
      parent: e,
      duration: 750,
      delay: 1100,
      type: 'circle',
      radius: {0: 220},
      fill: 'transparent',
      stroke: '#988ADE',
      strokeWidth: {35:0},
      opacity: 0.6,
      x: '50%',
      y: '50%',
      isRunLess: true,
      easing: mojs.easing.bezier(0, 1, 0.5, 1)
    }))

    timeline.add(new Burst({
			parent: e,
			duration: 1000,
			delay: 1100,
			shape : 'circle',
			fill: '#fff',
			x: '50%',
			y: '-10%',
			opacity: 0.3,
			childOptions: { radius: {'rand(20,5)':0} },
			radius: {0:100},
			degree: 50,
			angle: -25,
			count: 12,
			isRunLess: true,
			easing: mojs.easing.bezier(0.1, 1, 0.3, 1)
		}))

    timeline.start()

    if(game.get('against') === null) {
      this.spinCoin(e)
    }
  }

  spinCoin(e) {
    const timeline = this.spinTimeline = new Timeline()

    timeline.add(new Tween({
      delay: 7000,
      duration: 2000,
      repeat: 999,

      onUpdate(progress) {
        const easeProgress = extremeInOutEasing(progress)
        mojsHelper.setPrefixedStyle(e, 'transform', `rotate(${360 * easeProgress}deg)`)
      },

      onStart() {
        this.setProp('delay', 2000)
      }
    }))

    timeline.start()
  }

  close(e) {
    e.preventDefault()
    this.props.onClose()
  }
}


import React from 'react'
import { connect } from 'react-redux'
import moment from 'moment'
import numeral from 'numeral'
import pad from 'pad'
import cn from 'classnames'
import UIkit from 'uikit'

import { TICK2, TICK3, KNIFE_SOUND } from 'util/sounds'
import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import { GAME_CRASH } from 'constants/game'
import live from 'lib/live'

import History from './History'
import PlaceBet from './PlaceBet'
import PlayerBets from './PlayerBets'

import PlayerBet from './PlayerBet'
import { STATE_NOT_STARTED, STATE_IN_PROGRESS, STATE_STARTING, STATE_OVER } from './constants'
import style from './style.css'

const XTICK_LABEL_OFFSET  = 25
const XTICK_MARK_LENGTH   = 5
const YTICK_LABEL_OFFSET  = 20
const YTICK_MARK_LENGTH   = 5

class RouteCrash extends React.Component {
  constructor(props) {
    super(props)

    let lastBet = 100
    let lastCashout = '2.00'

    try {
      lastBet = localStorage.lastBet || 100
      lastCashout = localStorage.lastCashout || '2.00'
    } catch(e) {
    }

    this.state = {
      busy: false,
      gameState: STATE_NOT_STARTED,
      playing: false,
      cashoutAmount: 0,
      totalWagered: 0,
      bets: [],
      betAmount: lastBet,
      autoCashout: lastCashout,
      maxBet: 0,
      maxProfit: 0,
      jackpotPrize: 0,
      payout: 1,
      cashingOut: false,
      won: 0,
      history: [],
      bettingLoading: false
    }

    this._gameState = STATE_NOT_STARTED

    this._lag = false
    this._tickTimer = null
    this._serverStartTime = null
    this._startTime = Date.now()

    this._chartStyle = {
      axis: {
        lineWidth: 1,
        font: '14px GothamRounded',
        textAlign: 'center',
        strokeStyle: '#323434',
        fillStyle: '#969696'
      },

      graph: {
        base: {
          lineWidth: 7,
          strokeStyle: '#5a4781'
        },

        playing: {
          lineWidth: 7,
          strokeStyle: '#e9cc87'
        },

        cashed: {
          lineWidth: 7
        }
      }
    }

    this._yEmHeight = this._getEmHeight(this._chartStyle.axis.font)
  }

  componentDidMount() {
    live.setActiveGame(GAME_CRASH)

    // Listen for events
    this.__onCrashGameStarting = ::this._onCrashGameStarting
    live.events.on('crashGameStarting', this.__onCrashGameStarting)

    this.__onCrashGameStarted = ::this._onCrashGameStarted
    live.events.on('crashGameStarted', this.__onCrashGameStarted)

    this.__onCrashGameOver = ::this._onCrashGameOver
    live.events.on('crashGameOver', this.__onCrashGameOver)

    this.__onCrashGameBet = ::this._onCrashGameBet
    live.events.on('crashGameBet', this.__onCrashGameBet)

    this.__onCrashGameCash = ::this._onCrashGameCash
    live.events.on('crashGameCash', this.__onCrashGameCash)

    this.__onCrashGameTick = ::this._onCrashGameTick
    live.events.on('crashGameTick', this.__onCrashGameTick)

    this
      ._refresh()
      .catch(() => {})
      .then(() => {
        this._onOpen = () => this._refresh()
        live.events.on('open', this._onOpen)
      })

    // Setup the chart
    const { canvas, container } = this.refs
    if(!canvas.getContext) {
      throw new Error('Cannot get canvas context')
    }

    this._ctx = canvas.getContext('2d')
    this._canvasWidth = container.clientWidth
    this._canvasHeight = container.clientHeight
    this._configPlotSettings(true)

    this._animRequest = window.requestAnimationFrame(::this._renderCanvas)

  }

  componentWillUnmount() {
    live.setActiveGame(null)

    if(!!this._onOpen) {
      live.events.removeListener('open', this._onOpen)
    }

    live.events.removeListener('crashGameStarting', this.__onCrashGameStarting)
    live.events.removeListener('crashGameStarted', this.__onCrashGameStarted)
    live.events.removeListener('crashGameOver', this.__onCrashGameOver)
    live.events.removeListener('crashGameCash', this.__onCrashGameCash)
    live.events.removeListener('crashGameTick', this.__onCrashGameTick)
    live.events.removeListener('crashGameBet', this.__onCrashGameBet)

    window.cancelAnimationFrame(this.animRequest)
    this._ctx = null
    this._stopRendering = true
  }

  render() {
    const { currentUser } = this.props
    let { busy, gameState, history, betAmount, autoCashout, playing, totalWagered, bets, cashoutAmount, maxBet, maxProfit, payout, won, cashingOut, bettingLoading, jackpotPrize } = this.state
    // const chartClass = cn(style.chartContainer, {
      // [style.chartContainerEnd]: gameState === STATE_OVER
    // })

    bets = bets.sort((a, b) => b.betAmount - a.betAmount)

    return (
      <div className={style.container}>
        <div className="uk-flex uk-flex-auto">
          <div className={style.leftSide}>
            <div ref="container" className={style.leftSideContainer}>
              <div className={style.chartContainer}>
                <canvas ref="canvas" />
                <div className={style.gameStats}>
                  <h1><img src={require('assets/image/token.png')} /> <AnimatedCount value={totalWagered} initial={false} />T</h1>
                  <h6><AnimatedCount value={maxProfit} initial={false} />T Max Profit</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={style.controlsContainer}>
          { !!currentUser ? <PlaceBet gameState={gameState}
            autoCashout={autoCashout}
            betAmount={betAmount}
            payout={payout}
            playing={playing}
            maxBet={maxBet}
            loading={bettingLoading || cashingOut}
            onPlaceBet={::this._placeBet}
            onCashout={::this._cashout} /> : null }
          <PlayerBets bets={bets} gameState={gameState} />
        </div>
        <History history={history} />
      </div>
    )
  }

  _renderCanvas() {
    if(this._stopRendering) {
      return
    }

    this._calculatePlotValues()
    this._configPlotSettings()
    this._cleanChart()

    this._ctx.save()
    this._ctx.translate(this._xStart, this._canvasHeight - this._yStart)
    this._renderAxes()
    this._renderGraph()
    this._ctx.restore()

    // Draw game data
    this._ctx.save()
    const ctx = this._ctx
    const baseStyle = {
      textAlign: 'center',
      textBaseline: 'middle',
      fillStyle: this.state.playing ? '#F4D58D' : '#fff'
    }

    // Object.assign(ctx, { font: '30px GothamRounded', fillStyle: '#f4d58d' })
    // ctx.fillText(`${numeral(0).format('0,0')}T`, this._xStart + 60, this._yStart + 20)
    //
    // Object.assign(ctx, { font: '20px GothamRounded' })
    // ctx.fillText(`Jackpot Prize: ${numeral(0).format('0,0')}T`, this._xStart + 60, this._yStart + 45)
    //
    // Object.assign(ctx, { font: '12px GothamRounded', fillStyle: 'rgba(167, 167, 169, 0.3)' })
    // ctx.fillText(`${numeral(this._maxProfit).format('0,0')}T Max Round Profit`, this._xStart + 60, this._yStart + 65)

    switch(this._gameState) {
      case STATE_NOT_STARTED:
        Object.assign(ctx, {
          ...baseStyle,
          font: this._fontSizePx(5) + ' GothamRounded',
          fillStyle: '#F4D58D'
        })

        ctx.fillText('Connecting...', this._canvasWidth / 2, this._canvasHeight / 2)
        break
      case STATE_IN_PROGRESS:
        const payout = (this._currentPayout / 100)
        Object.assign(ctx, {
          ...baseStyle,
          font: this._fontSizePx(7) + ' GothamRounded',
          fillStyle: this.state.playing ? '#F4D58D' : '#fff'
        })

        if(this.state.playing) {
          this.setState({ payout })
        }

        ctx.fillText(numeral(payout).format('0.00') + 'x', this._canvasWidth / 2, this._canvasHeight / 2)
        break

      case STATE_STARTING:
        Object.assign(ctx, {
          ...baseStyle,
          font: this._fontSizePx(5) + ' GothamRounded',
          fillStyle: this.state.playing ? this._chartStyle.graph.playing.strokeStyle : '#fff'
        })

        const diff = (this._startTime - Date.now()) / 1000
        ctx.fillText(diff <= 0 ? 'Starting soon...' : `${this.state.playing ? 'Betting' : 'Starting'} in ${diff.toFixed(1)}s`, this._canvasWidth / 2, this._canvasHeight / 2)
        break

      case STATE_OVER:
        if(!this._lastCrash) {
          break
        }

        Object.assign(ctx, {
          ...baseStyle,
          font: this._fontSizePx(8) + ' GothamRounded',
          fillStyle: '#DA2C38'
        })

        ctx.fillText('Crashed', this._canvasWidth / 2, this._canvasHeight / 2 - this._fontSizeNum(8) / 2)
        ctx.fillText('@ ' + this._formatDecimals(this._lastCrash, 2) + 'x', this._canvasWidth / 2, this._canvasHeight / 2 + this._fontSizeNum(8) / 2)
        break
    }

    this._ctx.restore()
    this._animRequest = window.requestAnimationFrame(::this._renderCanvas)
  }

  _renderAxes() {
    const ctx = this._ctx
    Object.assign(ctx, this._chartStyle.axis)

    // Calcuate separation values
    const payoutSeparation = this._tickSeparation(this._yMinTickSeparation / this._YScale)
    const timeSeparation = this._tickSeparation(this._xMinTickSeparation / this._XScale)

    // Draw tick marks and axes
    let x = 0
    let y = 0
    ctx.beginPath()

    // Draw Payout tick marks
    let payout = this._YPayoutBeg + payoutSeparation
    for (; payout < this._YPayoutEnd; payout += payoutSeparation) {
      y = this._trY(payout)
      ctx.moveTo(0, y)
      ctx.lineTo(15, y)
    }

    // Draw time tick marks
    let time = timeSeparation
    for (; time < this._XTimeEnd; time += timeSeparation) {
      x = this._trX(time)
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 15)
    }

    // Draw background axes
    const x0 = this._trX(this._XTimeBeg)
    const x1 = this._trX(this._XTimeEnd)
    const y0 = this._trY(this._YPayoutBeg)
    const y1 = this._trY(this._YPayoutEnd)

    ctx.moveTo(x0, y1)
    ctx.lineTo(x0, y0)
    ctx.lineTo(x1, y0)

    // Finish drawing tick marks and axes.
    ctx.stroke();
    //
    // Draw payout tick labels.
    payout = this._YPayoutBeg + payoutSeparation
    for (; payout < this._YPayoutEnd; payout += payoutSeparation) {
      y = this._trY(payout)
      ctx.fillText((payout / 100) + 'x', -XTICK_LABEL_OFFSET, y)
    }

    // Draw time tick labels.
    time = 0
    for (; time < this._XTimeEnd; time += timeSeparation) {
      x = this._trX(time)
      ctx.fillText(time / 1000 + 's', x, YTICK_LABEL_OFFSET)
    }
  }

  _renderGraph() {
    const style = this._chartStyle.graph
    const ctx = this._ctx

    // Style the line depending on the game state.
    Object.assign(ctx, {
      ...style.base,
      ...(this.state.playing ? style.playing : style.progress),
    })

    const tstep = this._YPayoutEnd < 1000 ?
      // For < 10.00x step 100ms.
      100 :
      // After 10.00x the graph is pretty smooth. Make sure
      // that we move at least two pixels horizontally.
      Math.max(100, Math.floor(2 / this._XScale))

    ctx.beginPath()

    let t, x, y

    for (t = this._XTimeBeg; t < this._currentTime - tstep; t += tstep) {
      x = this._trX(t)
      y = this._trY(100 * this._calculateGamePayout(t))

      if(t+tstep < this._currentTime - tstep) {
        var c = (x + this._trX(t+tstep)) / 2,
        d = (y + this._trY(100 * this._calculateGamePayout(t+tstep))) / 2;
        ctx.quadraticCurveTo(x, y, c, d)
      }
    }

    ctx.stroke()

    if (x > 30 && t > 100) {
        let arrowX = this._trX(t + 50);
        let arrowY = this._trY(100 * this._calculateGamePayout(t + 50))
        let x_dir = arrowX - this._trX(t - 2 * tstep)
        let y_dir = arrowY - this._trY(100 * this._calculateGamePayout(t - 2 * tstep))
        let l = Math.sqrt(x_dir * x_dir + y_dir * y_dir)
        x_dir /= l
        y_dir /= l
        let radians = Math.atan(y_dir / x_dir)
        radians += ((y_dir > x_dir) ? -90 : 90) * Math.PI / 180
        let flicker_factor = 0
        if (x > this._plotWidth - 20 && y > this._plotHeight - 15) {
            flicker_factor = 1.1
        }
        let flicker_x = flicker_factor * (Math.random() * 2 - 1)
        let flicker_y = flicker_factor * (Math.random() * 2 - 1)
        let factor = 0
        this._renderArrowHead(ctx, arrowX + flicker_x + factor * x_dir, arrowY + flicker_y + factor * y_dir, radians)
    }
  }

  _renderArrowHead(ctx, x, y, radians) {
      ctx.save()
      ctx.beginPath()
      if (radians < 0.13) {
          x -= (0.29 - radians) * 50
          y += (0.9 - radians) * 100
      } else if (radians < 0.13) {
          x -= (0.32 - radians) * 50
          y += (0.85 - radians) * 100
      } else if (radians < 0.14) {
          x -= (0.32 - radians) * 50
          y += (0.77 - radians) * 100
      } else if (radians < 0.16) {
          x -= (0.32 - radians) * 50
          y += (0.75 - radians) * 100
      } else if (radians < 0.18) {
          x -= (0.37 - radians) * 50
          y += (0.75 - radians) * 100
      } else if (radians < 0.18) {
          x -= (0.37 - radians) * 50
          y += (0.75 - radians) * 100
      } else if (radians < 0.2) {
          x -= (0.38 - radians) * 50
          y += (0.7 - radians) * 100
      } else if (radians < 0.22) {
          x -= (0.38 - radians) * 50
          y += (0.65 - radians) * 100
      } else if (radians < 0.25) {
          x -= (0.4 - radians) * 50
          y += (0.6 - radians) * 100
      } else if (radians < 0.3) {
          x -= (0.43 - radians) * 50
          y += (0.54 - radians) * 100
      } else if (radians < 0.35) {
          x -= (0.45 - radians) * 50
          y += (0.52 - radians) * 100
      } else if (radians < 0.35) {
          x -= (0.47 - radians) * 50
          y += (0.52 - radians) * 100
      } else if (radians < 0.4) {
          x -= (0.49 - radians) * 50
          y += (0.53 - radians) * 100
      } else if (radians < 0.45) {
          x -= (0.52 - radians) * 50
          y += (0.54 - radians) * 100
      } else if (radians < 0.55) {
          x -= (0.57 - radians) * 50
          y += (0.57 - radians) * 100
      } else if (radians < 0.61) {
          x -= (0.62 - radians) * 50
          y += (0.62 - radians) * 100
      }
      ctx.translate(x, y)
      ctx.rotate(radians)
      ctx.moveTo(0, 0)
      ctx.lineTo(12, 30)
      ctx.lineTo(-12, 30)
      ctx.closePath()
      ctx.restore()

      const { graph } = this._chartStyle
      ctx.fillStyle = graph[this.state.playing ? 'playing' : 'base'].strokeStyle
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.shadowBlur = 0
      ctx.fill()
  }

  _refresh() {
    return fetch('/api/g/crash', {
      credentials: 'same-origin'
    })
      .then(r => r.json())
      .then(({ success, result }) => {
        if(success) {
          if(result.stage === STATE_IN_PROGRESS) {
            this._lastTick = Date.now()
          }

          this._startTime = new Date(Date.now() - result.elapsed)
          this._gameState = result.stage

          const updateState = {
            bets: result.bets || [],
            playing: false,
            gameState: result.stage,
            maxBet: result.maxBet,
            maxProfit: result.maxProfit,
            jackpotPrize: result.jackpotPrize,
            history: result.history.map(history => ({
              ...history,
              initial: true
            })),
            totalWagered: result.totalWagered
          }

          if(!!result.currentBet) {
            const { autoCashout, betAmount, profit, cashout, won } = result.currentBet
            updateState.won = won
            updateState.betAmount = betAmount
            updateState.autoCashout = this._formatDecimals(autoCashout / 100)

            if(cashout === 0) {
              updateState.playing = true
            }
          }

          this.setState(updateState)
        }
      })
  }

  _onCrashGameStarting({ game, untilStart }) {
    TICK3.play()

    this._startTime = new Date(Date.now() + untilStart)
    this._gameState = STATE_STARTING

    this.setState({
      gameState: STATE_STARTING,
      payout: 1,
      totalWagered: 0,
      bets: [],
      playing: false,
      won: 0,
      cashingOut: false,
      maxProfit: game.maxProfit
    })
  }

  _onCrashGameStarted({ game: { startedAt, maxProfit, totalWagered, game, bets, jackpotPrize } }) {
    TICK2.play()

    this._startTime = Date.now()
    this._lastTick = this._startTime
    this._gameState = STATE_IN_PROGRESS

    this.setState({
      totalWagered,
      jackpotPrize,
      bets: bets || [],
      gameState: STATE_IN_PROGRESS,
      won: 0,
      cashingOut: false
    })
  }

  _onCrashGameOver({ id, crash, hash, bets }) {
    const { currentUser } = this.props
    bets = bets || []

    if(this._tickTimer) {
      clearTimeout(this._tickTimer)
    }

    this._lastCrash = crash / 100
    this._gameState = STATE_OVER

    this.setState({
      bets: bets,
      gameState: STATE_OVER,
      playing: false,
    })

    this._lag = false

    TICK2.play()

    let betAmount = 0
    let cashout = 0
    let profit = 0

    if(!!currentUser) {
      for(let bet of bets) {
        if(bet.playerId === currentUser.id) {
          betAmount = bet.betAmount
          cashout = bet.cashout
          profit = bet.cashout > 0 ? bet.betAmount - bet.profit : -bet.betAmount
          break
        }
      }
    }

    this.setState({
      history: [{
        id,
        crash,
        hash,
        cashout,
        profit,
        bet: betAmount
      }, ...this.state.history].slice(0, 50)
    })
  }

  _onCrashGameBet({ totalWagered, player, jackpotPrize }) {
    this.setState({
      totalWagered,
      jackpotPrize,
      bets: [...this.state.bets, player]
    })
  }

  _onCrashGameCash({ bet }) {
    const { currentUser } = this.props
    const { bets } = this.state

    if(!!currentUser && bet.playerId === currentUser.id) {
      this.setState({
        playing: false,
        won: bet.won
      })

      UIkit.notification({
        message: `Congrats! You won ${numeral(bet.won).format('0,0')} tokens!`,
        status: 'success',
        pos: 'bottom-right',
        timeout: 5000
      })
    }

    this.setState({
      bets: bets.map(b => {
        if(b.playerId === bet.playerId) {
          return {
            ...b,
            ...bet
          }
        }

        return b
      })
    })
  }

  _onCrashGameTick({ elapsed }) {
    if(this._gameState !== STATE_IN_PROGRESS) {
      return
    }

    this._lastTick = Date.now()

    if(this._lag) {
      this._lag = false
    }

    const currentLatencyStartTime = this._lastTick - elapsed
    if(this._startTime > currentLatencyStartTime) {
      this._startTime = currentLatencyStartTime
    }

    if(this._tickTimer) {
      clearTimeout(this._tickTimer)
    }

    this._tickTimer = setTimeout(() => {
      this._lag = true
    }, 300);
  }

  _cashout() {
    this.setState({
      cashingOut: true
    })

    fetch('/api/g/crash/cash', {
      credentials: 'same-origin'
    })

    .then(r => r.json())
    .then(({ success, error, result }) => {
      if(!success) {
        return UIkit.notification({
          message: error,
          status: 'error',
          pos: 'bottom-right'
        })
      }

      this.setState({
        playing: false,
        cashingOut: false,
        won: result.won
      })
    })

    .then(() => this.setState({ busy: false }))
  }

  _placeBet(betAmount, autoCashout) {
    const { playing } = this.state

    this.setState({
      bettingLoading: true
    })

    fetch('/api/g/crash/bet', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        betAmount: parseInt(betAmount),
        autoCashout: parseInt(autoCashout * 100)
      })
    })

    .then(r => r.json())
    .then(({ success, error }) => {
      if(!success) {
        return UIkit.notification({
          message: error,
          status: 'error',
          pos: 'bottom-right'
        })
      }

      this.setState({
        playing: true,
        betAmount: parseInt(betAmount),
        autoCashout: parseInt(autoCashout * 100) / 100
      })
    })

    .then(() => this.setState({ bettingLoading: false }))
  }

  _calculatePlotValues() {
    this._currentTime = this._getElapsedTimeWithLag()
    this._currentGrowth = 100 * this._growthFunc(this._currentTime)
    this._currentPayout = 100 * this._calculateGamePayout(this._currentTime)

    // Plot variables
    this._XTimeBeg = 0
    this._XTimeEnd = Math.max(this._XTimeMinValue, this._currentTime)
    this._YPayoutBeg = 100
    this._YPayoutEnd = Math.max(this._YPayoutMinValue, this._currentGrowth)

    // Translation between semantic and physical measures.
    this._XScale = this._plotWidth / (this._XTimeEnd - this._XTimeBeg)
    this._YScale = this._plotHeight / (this._YPayoutEnd - this._YPayoutBeg)
  }

  _configPlotSettings(forceUpdate) {
    const { canvas, container } = this.refs
    const devicePixelRatio = window.devicePixelRatio || 1
    const backingStoreRatio = this._ctx.webkitBackingStorePixelRatio ||
      this._ctx.mozBackingStorePixelRatio ||
      this._ctx.msBackingStorePixelRatio ||
      this._ctx.oBackingStorePixelRatio ||
      this._ctx.backingStorePixelRatio || 1

    const ratio = devicePixelRatio / backingStoreRatio;

    if(this._canvasWidth !== canvas.offsetWidth || this._canvasHeight !== canvas.offsetHeight
      || this._devicePixelRatio !== devicePixelRatio || this._backingStoreRatio !== backingStoreRatio
      || forceUpdate
    ) {
      this._canvasWidth = canvas.offsetWidth
      this._canvasHeight = canvas.offsetHeight
      this._devicePixelRatio = devicePixelRatio
      this._backingStoreRatio = backingStoreRatio

      // canvas.style.width = (this._canvasWidth) + 'px';
      // canvas.style.height = (this._canvasHeight) + 'px';

      canvas.width = (canvas.offsetWidth * ratio)
      canvas.height = (canvas.offsetHeight * ratio)
      this._yEmHeight = this._getEmHeight(this._chartStyle.axis.font)
    }

    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    this._xMinTickSeparation = 2 * this._ctx.measureText('10000').width
    this._yMinTickSeparation = this._yEmHeight * 4

    this._xStart = 60
    this._yStart = 40
    this._plotWidth = this._canvasWidth - this._xStart
    this._plotHeight = this._canvasHeight - this._yStart

    // Minimum of 10 Seconds on x-Axis.
    this._XTimeMinValue = 10000

    // Minimum multiplier of 2.00x on y-Axis.
    this._YPayoutMinValue = 200
  }

  _calculateGamePayout(ms) {
    const gamePayout = Math.floor(100 * this._growthFunc(ms)) / 100
    console.assert(isFinite(gamePayout))
    return gamePayout
  }

  _getElapsedTimeWithLag() {
    if(this._gameState == STATE_IN_PROGRESS) {
      let elapsed = 0
      if(this._lag) {
        elapsed = this._lastTick - this._startTime + 300
      } else {
        elapsed = this._getElapsedTime(this._startTime)
      }

      return elapsed
    }

    return 0
  }

  _getElapsedTime(startTime) {
    return Date.now() - startTime
  }

  // Function to calculate the distance in semantic values between ticks. The
  // parameter s is the minimum tick separation and the function produces a
  // prettier value.
  _tickSeparation(s) {
    if (!Number.isFinite(s)) {
      throw new Error('Is not a number: ', s)
    }

    let r = 1
    while(true) {
      if (r > s) {
        return r
      }

      r *= 2

      if (r > s) {
        return r
      }

      r *= 5
    }
  }

  // Measure the em-Height by CSS hackery as height text measurement is not
  // available on most browsers. From:
  // https://galacticmilk.com/journal/2011/01/html5-typographic-metrics/#measure
  _getEmHeight(font) {
    const sp = document.createElement('span')
    sp.style.font = font
    sp.style.display = 'inline'
    sp.textContent = 'Hello world!'

    document.body.appendChild(sp)
    const emHeight = sp.offsetHeight
    document.body.removeChild(sp)
    return emHeight
  }

  // _formatDecimals
  _formatDecimals(n, decimals) {
    if (typeof decimals === 'undefined') {
      decimals = (n % 100 === 0 ? 0 : 2)
    }

    return n.toFixed(decimals).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

  // _fontSizeNum
  _fontSizeNum = times => times * this._canvasWidth / 100

  // _fontSizePx
  _fontSizePx = times => this._fontSizeNum(times).toFixed(2) + 'px'

  // _trX
  _trX = t => this._XScale * (t - this._XTimeBeg)

  // _trY
  _trY = p => - (this._YScale * (p - this._YPayoutBeg))

  // _cleanChart
  _cleanChart = () => this._ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight)

  // _growthFunc
  _growthFunc = ms => Math.pow(Math.E, 0.00006 * ms)
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteCrash)

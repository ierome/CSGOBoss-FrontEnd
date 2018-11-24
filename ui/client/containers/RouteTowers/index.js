
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import _ from 'underscore'
import numeral from 'numeral'

import live, { setActiveGame } from 'lib/live'
import { GAME_TOWERS } from 'constants/game'
import api from 'lib/api'
import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import Step from './step'
import style from './style.css'

class RouteTowers extends Component {
  constructor(props) {
    super(props)

    let gameMode = null

    try {
      gameMode = localStorage.towersGameMode
    } catch(e) {
    }

    this.state = {
      gameMode,

      loading: true,
      busy: false,
      options: {
        totalWagered: 0
      },
      steps: [],
      chosenSteps: [],
      betAmount: 0.10,
      nextReward: 0,
      playing: false,
      history: [],
      bombs: [],

      lastKeyPair: null
    }
  }

  componentDidMount() {
    this._load()

    this._onAddHistory = history => {
      const newHistory = this.state.history
      history.__newRecord = true
      newHistory.unshift(history)
      newHistory.splice(25)

      this.setState({
        history: newHistory,
        options: {
          ...this.state.options,
          totalWagered: this.state.options.totalWagered + history.wagered
        }
      })
    }

    live.on('addTowersHistory', this._onAddHistory)
  }

  componentWillUnmount() {
    setActiveGame(null)
    live.removeListener('addTowersHistory', this._onAddHistory)
  }

  render() {
    const { currentUser } = this.props
    const { loading, options, gameMode, steps, nextReward, chosenSteps, betAmount, playing, busy, currentGame, history, lastKeyPair, bombs } = this.state

    const isDemoMode = !currentUser || currentUser.tokens < 0.10

    if(loading) {
      return (
        <div className={style.container}>
          <div className="uk-flex uk-width-1-1 uk-height-1-1 uk-flex-center uk-flex-middle">
            <h4><Spinner className="uk-margin-right" /> Loading game...</h4>
          </div>
        </div>
      )
    }

    return (
      <div className={style.container}>
        <div className="uk-flex-1 uk-margin-top">
          <div className={style.tower}>
            <div className={style.header}>
              <img src={require('./assets/tower.svg')} />
              <div className={style.headerContainer}>
                <div>Towers</div>
                {playing ? <span><AnimatedCount value={currentGame.wager} initial={false} />T WAGERED</span> : <span></span> }
              </div>
            </div>
            <div className={cn(style.demoMode, {[style.demoModeVisible]: playing && currentGame.demo })}>Demo Mode</div>
            <div key={!!currentGame ? currentGame.id : 0} className={style.steps}>
              {steps.map((steps, i) =>
                <Step key={steps[0]}
                  currentGame={currentGame}
                  steps={steps}
                  active={nextReward >= steps[0] || !currentGame}
                  disabled={nextReward !== steps[0] || !currentGame || chosenSteps.length === this.state.steps.length}
                  chosenStep={chosenSteps[this.state.steps.length - i - 1]}
                  bomb={!playing ? bombs[this.state.steps.length - i - 1] : null}
                  onClick={::this._onStepClick} />
              )}
            </div>
            <div className="uk-flex uk-flex-middle uk-width-1-1">
              { !playing ?
                <button disabled={busy || isDemoMode} className={style.playButton} onClick={e => this._onStartClick(e, false)}>{ busy ? 'Please wait...' :  'Start Game' }</button> :
                <button disabled={busy} className={style.takeButton} onClick={::this._onTakeClick}>{ busy ? 'Please wait...' : <span>Claim <AnimatedCount value={currentGame.rewards[chosenSteps.length - 1] || currentGame.wager} duration={900} />T</span> }</button> }

              <button disabled={busy} className={cn(style.demoButton, {[style.demoButtonHidden]: playing })} onClick={e => this._onStartClick(e, true)}>Play Demo</button>
            </div>

            <div className={style.inputContainer}>
              <div className={style.inputAddon}>
                <button disabled={playing} onClick={::this._onMinClick}>MIN</button>
                <button disabled={playing} onClick={::this._onMinusClick}><i className="fa fa-minus" /></button>
              </div>
              <input disabled={playing} type="text" placeholder="0" onChange={::this._onBetChange} value={betAmount} />
              <div className={style.inputAddon}>
                <button disabled={playing} onClick={::this._onAddClick}><i className="fa fa-plus" /></button>
                <button disabled={playing} onClick={::this._onMaxClick}>MAX</button>
              </div>
            </div>
          </div>
          <div className={cn(style.gameModes, { [style.gameModesDisabled]: playing, [style.gameModesHidden]: playing })}>
            {_.map(options.gameModes, (mode, id) =>
              <button disabled={playing} key={mode.id} className={cn(style.gameMode, { [style.gameModeActive]: gameMode === mode.id })} onClick={() => this._onGameModeChange(mode.id)}>
                {mode.name}
                <div>
                  {Array.from({ length: mode.difficulty }, (_, i) =>
                    <img key={i} src={require('./assets/star.svg')} />
                  )}
                </div>
                </button>
            )}
          </div>
          <div className={cn(style.fair, { [style.fairShow]: !!lastKeyPair, [style.fairPrevious]: !!lastKeyPair && !playing })}>
            <div className={style.fairHeader}>{ !!lastKeyPair && !playing ? 'Previous Game' : 'Current Game' }</div>
            { !!lastKeyPair ? <div className={style.fairHash}><i className="fa fa-lock" /> {lastKeyPair.hash} </div> : null }
            { !!lastKeyPair && !!lastKeyPair.secret ? <div className={style.fairKey}><i className="fa fa-key" /> {lastKeyPair.secret} </div> : null }
          </div>
        </div>
        <div className={style.historyContainer}>
          <div className={style.historyContainerHeader}><i className="fa fa-history" /> Recent Plays</div>
          <div className={style.histories}>
            {history.map(h =>
              <div key={h.id} className={cn(style.history, { [style.newHistory]: h.__newRecord, [style.historyProfitBad]: h.playerProfit < 0 })}>
                <div className={style.historyProfit}>{h.playerProfit > 0 ? '+' : ''}<AnimatedCount value={h.playerProfit} initial={!h.__newRecord} />T</div>
                <div className={style.historyName}><img src={h.playerAvatar} /> <div>{h.playerName}</div></div>
                <div className={style.historyWager}>{numeral(h.wagered).format('0,0.00')} on {h.difficultyName}{ h.steps > 0 ? <div>{numeral(h.steps).format('0,0')} steps</div> : null }</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  _onMinusClick() {
    const { options, gameMode, betAmount } = this.state
    const mode = _.findWhere(options.gameModes, {
      id: gameMode
    })

    if(!!mode) {
      const updateAmount = parseFloat(numeral(Math.max(mode.minBet, ((parseFloat(betAmount) || 1) / 1.45))).format('0,0.00'))

      this.setState({
        betAmount: updateAmount,
        ...this._updateSteps(null, updateAmount)
      })
    }
  }

  _onAddClick() {
    const { options, gameMode, betAmount } = this.state
    const mode = _.findWhere(options.gameModes, {
      id: gameMode
    })

    if(!!mode) {
      const updateAmount = parseFloat(numeral(Math.min(mode.maxBet, ((parseFloat(betAmount) || 1) * 1.45))).format('0,0.00'))

      this.setState({
        betAmount: updateAmount,
        ...this._updateSteps(null, updateAmount)
      })
    }
  }

  _onMinClick() {
    const { options, gameMode } = this.state
    const mode = _.findWhere(options.gameModes, {
      id: gameMode
    })

    if(!!mode) {
      const betAmount = mode.minBet

      this.setState({
        betAmount,
        ...this._updateSteps(null, betAmount)
      })
    }
  }

  _onMaxClick() {
    const { currentUser } = this.props
    const { options, gameMode } = this.state
    const mode = _.findWhere(options.gameModes, {
      id: gameMode
    })

    if(!!mode) {
      let betAmount = mode.maxBet

      if(!!currentUser) {
        betAmount = Math.min(currentUser.tokens, mode.maxBet)
      }

      this.setState({
        betAmount,
        ...this._updateSteps(null, betAmount)
      })
    }
  }

  _onGameModeChange(id) {
    const { options, playing } = this.state

    if(playing) {
      return
    }

    try {
      localStorage.towersGameMode = id
    } catch(e) {
    }

    this.setState({
      ...this._updateSteps(options, null, id),
      chosenSteps: [],
      bombs: []
    })
  }

  _onBetChange(e) {
    const betAmount = e.target.value

    this.setState({
      betAmount,
      ...this._updateSteps(null, betAmount)
    })
  }

  _load() {
    api('g/towers').then(({ currentGame, ...options }) => {
      this._loadCurrentGame(currentGame, options)
      setActiveGame(GAME_TOWERS)
    })
  }

  _loadCurrentGame(currentGame, options) {
    options = (options || this.state.options)
    options = {
      ...options,
      gameModes: _.sortBy(options.gameModes, 'difficulty')
    }

    const newState = {
      currentGame,
      options,
      ...this._updateSteps(options, !!currentGame ? currentGame.wager : null),
      loading: false,
      busy: false,
      bombs: [],
      playing: !!currentGame,
      history: options.history
    }

    if(!!currentGame) {
      this.setState({
        lastKeyPair: {
          hash: currentGame.hash
        }
      })

      newState.betAmount = currentGame.wager
      newState.chosenSteps = currentGame.chosenSteps
      newState.nextReward = currentGame.rewards[currentGame.chosenSteps.length >= currentGame.rewards.length ? currentGame.chosenSteps.length - 1 : currentGame.chosenSteps.length]
    }

    this.setState(newState)
  }

  _onTakeClick() {
    if(!this.state.playing) {
      return
    }

    this.setState({
      busy: true
    })

    api('g/towers/take/' + this.state.currentGame.id, {
      method: 'POST'
    })

    .then(response => {
      this.setState({
        busy: false,
        playing: false,
        lastKeyPair: {
          ...this.state.lastKeyPair,
          secret: response.secret
        },
        bombs: response.bombs
      })
    })

    .catch(() => {
      this.setState({
        busy: false
      })
    })

  }

  _onStartClick(e, demo) {
    const { playing, gameMode, betAmount } = this.state

    if(!playing) {
      this.setState({
        busy: true
      })

      api('g/towers/start', {
        body: {
          demo,
          gameMode,
          betAmount: parseFloat(betAmount)
        }
      })

      .then(response => {
        this._loadCurrentGame(response)
      })

      .catch(() =>
        this.setState({
          busy: false
        })
      )

      return
    }
  }

  _onStepClick(idx) {
    const { playing, currentGame, options, gameMode, steps, nextReward, chosenSteps } = this.state
    const mode = options.gameModes[gameMode]

    if(playing) {
      return api('g/towers/step/' + currentGame.id, {
        body: {
          step: idx
        }
      })

      .then(response => {

        if(response.state === 'ACTIVE') {
          this.setState({
            nextReward: response.nextReward,
            chosenSteps: [ ...chosenSteps, idx ]
          })
        } else {
          this.setState({
            playing: false,
            chosenSteps: [ ...chosenSteps, idx ],
            lastKeyPair: {
              ...this.state.lastKeyPair,
              secret: response.secret
            },
            bombs: response.bombs
          })
        }

        return response.state === 'ACTIVE'
      })
    }

    // const step = steps.reduce((current, step, i) =>
    //   step[0] === nextReward ? i : current
    // , -1)
    //
    // this.setState({
    //   nextReward: steps[step - 1] || nextReward,
    //   chosenSteps: [ ...chosenSteps, idx ]
    // })

    return Promise.resolve(true)
  }

  _updateSteps(options, betAmount, gameMode) {
    const { currentUser } = this.props

    options = options || this.state.options
    betAmount = betAmount || parseFloat(this.state.betAmount)

    if(typeof gameMode === 'undefined' || gameMode < 0) {
      gameMode = (this.state.gameMode || options.gameModes[0].id)
    }

    const mode = _.findWhere(options.gameModes, {
      id: gameMode
    })

    if(typeof betAmount === 'undefined' || isNaN(betAmount)) {
      betAmount = mode.minBet
    }

    betAmount = Math.max(mode.minBet, betAmount)
    betAmount = Math.min(mode.maxBet, betAmount)

    const breakPoint = mode.breakPoints.reduce((current, point) =>
      betAmount >= point.minAmount && betAmount < point.maxAmount ? point : current
    , mode.breakPoints[0])

    const steps = Array.from({ length: breakPoint.steps }).map((v, k, a) =>
      Array.from({ length: mode.fields }, () =>
        (betAmount * Math.pow(mode.multiplier, k + 1))
      )
    ).reverse()

    return {
      // betAmount,
      gameMode,
      steps,
      nextReward: steps[steps.length - 1][0]
    }
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteTowers)

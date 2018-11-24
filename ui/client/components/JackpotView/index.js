
import React, { Component } from 'react'
import cn from 'classnames'
import _ from 'underscore'
import UIkit from 'uikit'
import numeral from 'numeral'
import { Link } from 'react-router'

import UISpinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import Sound from 'lib/sound'

import Timer from './Timer'
import Block from './Block'
import Progress from './Progress'
import Deposit from './Deposit'
import Spinner from './Spinner'
import DepositConfirm from './DepositConfirm'
import Item from './Item'

import { JACKPOT_SKIN_MODE } from 'constants/jackpot'
import { KNIFE_SOUND, BET, RELOAD } from 'util/sounds'
import live, { setActiveGame } from 'lib/live'
import api from 'lib/api'

import style from './style.css'

const BET_SOUNDS = [
  new Sound(require('./assets/bet1.mp3')),
  new Sound(require('./assets/bet2.mp3')),
  new Sound(require('./assets/bet3.mp3')),
  new Sound(require('./assets/bet4.wav')),
  new Sound(require('./assets/bet5.mp3')),
]

for(let sound of BET_SOUNDS) {
  sound.audio.volume = 0.5
}

const snipeSound = new Sound(require('./assets/snipe.mp3'))

const ambience = new Sound(require('./assets/ambience.mp3'))
ambience.audio.loop   = true
ambience.audio.volume = 0.3

class JackpotView extends Component {
  static childContextTypes = {
    convertTokens: React.PropTypes.func
  }

  constructor(props) {
    super(props)

    this._gameType = props.gameType
    this._gameMode = props.mode
    this.state = {
      betAmount: 1,
      placingBet: false,
      canSnipe: false,
      gameStarting: false,

      offers: [],
      active: null,
      loading: true,
      gameOver: false,
      showSecret: false,
      chances: [],
      chance: 0
    }
  }

  componentDidMount() {
    setActiveGame(this._gameType)
    // // ambience.play()
    //
    // this._onNewOffer = ({ offer }) => {
    //   this.setState({
    //     active: {
    //       ...this.state.active,
    //       offers: [
    //         ...this.state.active.offers,
    //         offer
    //       ]
    //     }
    //   })
    //
    //   KNIFE_SOUND.play()
    // }
    //
    // this._onRemoveOffer = ({ id, error }) => {
    //   this.setState({
    //     active: {
    //       ...this.state.active,
    //       offers: this.state.active.offers.filter(o => o.id !== id)
    //     }
    //   })
    //
    //   if(!!error) {
    //     UIkit.notification({
    //       message: error,
    //       status: 'error',
    //       pos: 'bottom-right'
    //     })
    //   }
    // }
    //
    // this._onConfirmOffer = ({ id, subtotal }) => {
    //   this.setState({
    //     active: {
    //       ...this.state.active,
    //       offers: this.state.active.offers.filter(o => o.id !== id)
    //     }
    //   })
    // }
    //
    this._onJackpotUpdate = ({ entries, items, hasSnipe, ...updates }) => {
      console.log(updates)
      const { active } = this.state

      if(active.mode === 1) {
        updates.items = !!items ? _.sortBy([...items, ...this.state.active.items], 'tokens').reverse() : this.state.active.items
      }

      this.setState({
        active: {
          ...this.state.active,
          ...updates,

      //     items: !!items ? _.sortBy([...items, ...this.state.active.items], 'price').reverse() : this.state.active.items,
          entries: !!entries ? [
            ...entries.map(e => ({ ...e, _newBlock: true })),
            ...this.state.active.entries
          ] : this.state.active.entries
        }
      })

      if(!!entries) {
        if(hasSnipe) {
          snipeSound.play()
        } else {
          _.sample(BET_SOUNDS).play()
        }
      }
    }

    this._onOpen = () => this._refresh()

    this._onJackpotNew = jackpot => {
      KNIFE_SOUND.play()

      this.setState({
        active: jackpot,
        canSnipe: false,
        showSecret: false,
        gameOver: false,
        gameStarting: false,
        chances: [],
        chance: 0
      })
    }

    this._refresh().then(() => {
      this.__onJackpotUpdate = ::this._onJackpotUpdate
      live.on('jackpotChanged', this.__onJackpotUpdate)

      this.__onJackpotNew = ::this._onJackpotNew
      live.on('jackpotNew', this.__onJackpotNew)

      this.__onOpen = ::this._onOpen
      live.on('connect', this.__onOpen)
    })
  }

  componentWillUnmount() {
    console.log('unmout')
    // ambience.audio.pause()

    if(!!this.__onOpen) {
    //   live.events.removeListener('tradeOfferIncoming', this.__onNewOffer)
    //   live.events.removeListener('tradeOfferCanceled', this.__onRemoveOffer)
    //   live.events.removeListener('tradeOfferConfirmed', this.__onConfirmOffer)
      live.removeListener('jackpotChanged', this.__onJackpotUpdate)
      live.removeListener('jackpotNew', this.__onJackpotNew)
      live.removeListener('connect', this.__onOpen)
    }

    setActiveGame(null)
  }

  componentDidUpdate(prevProps, prevState) {
    const { active } = this.state
    const gameOver = !!active && active.stage === 2

    if(gameOver !== this.state.gameOver) {
      this.setState({
        gameOver,
        showSecret: false
      })

      this._calculateChances()
    }

    if(!!active && !prevState.active || (!!active && !!prevState.active && active.entries.length !== prevState.active.entries.length)) {
      this._calculateChances()
    }
  }

  getChildContext() {
    return {
      convertTokens: tokens => {
        const { active } = this.state

        if(!!active && active.mode === 1) {
          return tokens / 1000
        }

        return tokens
      }
    }
  }

  render() {
    const { currencyFormat, currentUser, session, location } = this.props
    let { settings, betAmount, offers, loading, active, gameOver, chances, showSecret, placingBet, canSnipe, gameStarting } = this.state
    const lastColor = !!active && active.entries.length ? active.entries[0].color : ''

    const showSpinner = !!active && !!active.winner
    const betDisabled = !active || !currentUser || placingBet
    const chance = !!currentUser && !!chances && chances[currentUser.steamId] ? chances[currentUser.steamId].chance : 0

    const items = (!!active && active.mode === 1 ? active.items : []) || []
    const playerChances = !!chances ? Object.keys(chances).map(k => chances[k]) : []

    const path = location.pathname.split('/')

    return (
      <div className={style.container}>
        <div className="uk-container uk-flex uk-flex-column uk-flex-1 uk-width-1-1">
          <div className={style.header}>
            <div className={style.modeNameContainer}>
              <div className={style.modeName}>{ loading ? <UISpinner /> : settings.name }</div>
              { !loading ? <div className={style.modeDescription}>{numeral(settings.minimumBet).format('0,0.00')}T Minimum Bet{ settings.maximumBets ? ` and ${numeral(settings.maximumBets).format('0,0')} Maximum Bets` : null }</div> : null }
            </div>
            <div className="uk-flex-1 uk-text-right">
              <Link to="/jackpot" className={cn(style.mode, { [style.modeActive]: path.length === 1 || path[path.length - 1].indexOf('regular') >= 0 })}>Classic</Link>
              <Link to="/jackpot/small" className={cn(style.mode, { [style.modeActive]: path[path.length - 1].indexOf('small') >= 0 })}>Small Jackpot</Link>
            </div>
          </div>

          <div className="uk-flex uk-flex-middle uk-margin-top">
            <div className={style.widget}>
              <div className={style.potSize}><img src={require('./assets/dollarbag.svg')} /> <AnimatedCount animated value={!!active ? active.potSize : 0} />T</div>
              <div className={style.widgetName}>Current Pot Size</div>
            </div>

            <Progress active={active} showSpinner={showSpinner} currencyFormat={currencyFormat} size={active ? active.potSize : 0} items={0} value={100}>
              <Timer active={active} onTick={::this._onTick} hide={showSpinner} />
            </Progress>

            { showSpinner ? <Spinner currencyFormat={currencyFormat} active={active} chances={chances} chance={chance} onShow={() => this.setState({ showSecret: true })} /> : null }

          </div>

          { !!currentUser ? <div className={cn(style.betControls, {[style.hide]: showSpinner})}>
            <input type="text" value={betAmount} onChange={e => this.setState({ betAmount: e.target.value })} placeholder="Bet Amount" />
            <div className="uk-flex">


            { !!currentUser && !!active ?
                <a className={cn('uk-button uk-button-secondary uk-button-large', style.depositButton, canSnipe ? style.snipeModifier : null, gameStarting ? style.hideDeposit : null)}
                  target="_blank"
                  href={active.tradeLink}
                  disabled={betDisabled || parseInt(betAmount) < active.minimumBet || parseInt(betAmount) > currentUser.tokens}
                  onClick={::this._deposit}>{betDisabled ? <UISpinner /> : canSnipe ? <span><img src={require('assets/image/sniper.png')} /> SNIPE!</span> : 'Deposit' }</a> : null }

              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: active.minimumBet })}>min</button>
              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.max(settings.minimum, parseFloat(parseFloat(betAmount) / 2)) })}>1/2</button>
              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) + 0.10)) })}>+0.10</button>
              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) + 1)) })}>+1</button>
              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) * 2)) })}>x2</button>
              <button className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: !!currentUser ? currentUser.tokens : 0 })}>max</button>

            </div>
          </div> : null }

          { !!active ? <div className={style.innerContainer}>

            { !loading ? <div className={style.leftSide}>
              <div className={style.playerChances}>
                {playerChances.map((chance, i) =>
                  <div key={chance.steamId} className={style.playerChance} style={{ backgroundImage: `url(${chance.avatar})` }}>
                    <div>{ chance.chance }%</div>
                  </div>
                )}

              </div>
            </div> : null }

            { loading ? <div className={style.content}><div className="uk-margin-top uk-text-bold uk-text-center uk-text-muted">Loading game data...</div></div> : null }
            { !loading ? <div className={style.content}>
              <div className={style.blocks}>

                { showSecret && !!active.secret ? <Block winner={active.winner} secret={active.secret} /> : null }
                {!!currentUser && parseFloat(chance) > 0 ? <div className={style.chance} style={{ background: lastColor }}>You have a {chance}% chance at winning</div> : null }

                {active.entries.map(entry =>
                  <Block key={entry.ticketStart} entry={entry} dimmed={gameOver} currencyFormat={currencyFormat} />
                )}

                { !!active ? <Block hash={active.hash} currencyFormat={currencyFormat} /> : null }
              </div>
            </div> : null }

          </div> : null }
        </div>
      </div>
    )

/*

{ !loading ? <div className={style.historyContainer}>
  <div className={style.historyContainerHeader}><i className="fa fa-history" /> Recent Winners</div>
</div> : null }

<div className="uk-text-right">
  { loading ? <UISpinner size={75} /> : null }
</div>

<div className={cn(style.progressContainer, {[style.hide]: showSpinner})}>
  { !!currentUser && !!active ?
      <a className={cn('uk-button uk-button-secondary uk-button-large', style.depositButton, canSnipe ? style.snipeModifier : null, gameStarting ? style.hideDeposit : null)}
        target="_blank"
        href={active.tradeLink}
        disabled={betDisabled || parseInt(betAmount) < active.minimumBet || parseInt(betAmount) > currentUser.tokens}
        onClick={::this._deposit}>{betDisabled ? <UISpinner /> : canSnipe ? <span><img src={require('assets/image/sniper.png')} /> SNIPE!</span> : 'Deposit' }</a> : null }
</div>
 */
    return (
      <div className="uk-margin-top uk-margin-bottom">
        <div className="uk-container">
          <div className={cn('uk-flex uk-flex-middle uk-margin-bottom')}>
            <Timer active={active} onTick={::this._onTick} hide={showSpinner} />
            <Progress currencyFormat={currencyFormat} size={active ? active.potSize : 0} items={0} value={100} />
            { loading ? <UISpinner size={75} /> : null }
          </div>
          <div className={style.playerChances}>
            {playerChances.map(chance =>
              <div key={chance.steamId} className={style.playerChance} style={{ backgroundImage: `url(${chance.avatar})` }}>
                <div>{ chance.chance }%</div>
              </div>
            )}

          </div>
          { !!currentUser && !!active && this._gameMode !== JACKPOT_SKIN_MODE ? <div className={cn(style.betControls, {[style.hide]: showSpinner})}>
            <input disabled={betDisabled} type="number" value={betAmount} onChange={e => this.setState({ betAmount: e.target.value })} placeholder="Bet Amount" />
            <div className="uk-flex">
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: active.minimumBet })}>min</button>
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.max(settings.minimum, parseFloat(parseFloat(betAmount) / 2)) })}>1/2</button>
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) + 0.10)) })}>+0.10</button>
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) + 1)) })}>+1</button>
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: Math.min(!!currentUser ? currentUser.tokens : 0, parseFloat(parseFloat(betAmount) * 2)) })}>x2</button>
              <button disabled={betDisabled} className="uk-button uk-button-default uk-button-small" onClick={() => this.setState({ betAmount: !!currentUser ? currentUser.tokens : 0 })}>max</button>
              { !!currentUser && !!active ?
                  <a className={cn('uk-button uk-button-secondary uk-button-large', style.depositButton, canSnipe ? style.snipeModifier : null, gameStarting ? style.hideDeposit : null)}
                    target="_blank"
                    href={active.tradeLink}
                    disabled={betDisabled || parseInt(betAmount) < active.minimumBet || parseInt(betAmount) > currentUser.tokens}
                    onClick={::this._deposit}>{betDisabled ? <UISpinner /> : canSnipe ? <span><img src={require('assets/image/sniper.png')} /> SNIPE!</span> : 'Deposit' }</a> : null }
            </div>
          </div> : null }
          {showSpinner ? <Spinner currencyFormat={currencyFormat} active={active} chances={chances} chance={chance} onShow={() => this.setState({ showSecret: true })} /> : null }
          {active && !!active.offers ? <div className="uk-flex">
            {active.offers.map(offer =>
              <DepositConfirm key={offer.id} offer={offer} />
            )}
          </div> : null }
          <div className="uk-flex">
            {active ? <div className={style.blocks}>
              {showSecret ? <Block winner={active.winner} secret={active.secret} /> : null }
              {!!currentUser && parseFloat(chance) > 0 ? <div className={style.chance} style={{ background: lastColor }}>You have a {chance}% chance at winning</div> : null }
              {active.entries.map(entry =>
                <Block key={entry.ticketStart} entry={entry} dimmed={gameOver} currencyFormat={currencyFormat} />
              )}

              <Block hash={active.hash} currencyFormat={currencyFormat} />
            </div> : null }
            <div>
            {items.map(item =>
              <Item key={item.id} item={item} currencyFormat={currencyFormat} />
            )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  _renderOffers() {
    const { offers } = this.state
    if(!offers.length) {
      return null
    }

    const columnClass = offers.length === 1 ? 'col-md-12' : 'col-md-6'

    return (
      <div className="row">
        {offers.map(offer =>
          <div key={offer.id} className={columnClass}>
            <DepositConfirm offer={offer} />
          </div>
        )}
      </div>
    )
  }

  _refresh() {
    setActiveGame(this._gameType)

    this.setState({
      loading: true,
      placingBet: false,
      gameStarting: false,
      gameOver: false,
      showSecret: false
    })

    return api(`g/jackpot/${this._gameType}/`).then(({ settings, active }) => {
      // if(!success) {
      //   UIkit.notification({
      //     message: error,
      //     status: 'error',
      //     pos: 'bottom-right'
      //   })
      //
      //   return
      // }
      //
      this.setState({
        settings,
        active,
        loading: false
      })
    })
  }

  _deposit(e) {
    if(this._gameMode === JACKPOT_SKIN_MODE) {
      return
    }

    e.preventDefault()

    this.setState({
      placingBet: true,
      gameStarting: false
    })

    api(`g/jackpot/${this._gameType}/increase/`, {
      body: {
        amount: parseFloat(this.state.betAmount)
      }
    })

    .then(() =>
      this.setState({ placingBet: false })
    , () =>
      this.setState({ placingBet: false })
    )
  }

  _onTick(ms, completed) {
    const { active, gameOver, canSnipe, settings } = this.state

    if(!!active && !!active.winner || gameOver) {
      return
    }

    if(completed) {
      this.setState({
        canSnipe: false,
        gameStarting: active.stage !== 0
      })
    } else if(!canSnipe && !!settings.jackpotSnipeUnder && ms <= settings.jackpotSnipeUnder) {
      RELOAD.play()

      this.setState({
        canSnipe: true
      })
    }
  }

  _calculateChances() {
    const { currentUser } = this.props
    const { active } = this.state
    if(!active) {
      return
    }

    const { entries } = active
    const chances = _
      .chain(entries)
      .groupBy('steamId')
      .map((e, k) =>
        [k, e.reduce((prev, e) => ({
          steamId: e.steamId,
          avatar: e.avatar,
          name: e.name,
          total: e.tokens + prev.total,
          chance: (((e.tokens + prev.total) / active.potSize) * 100).toFixed(2)
        }), {
          total: 0
        })]
      )
      .object()
      .value()

    this.setState({
      chances
    })
  }
}

JackpotView.defaultProps = {
  currencyFormat: '0,0.00'
}

export default JackpotView

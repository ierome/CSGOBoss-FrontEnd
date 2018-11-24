
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import api from 'lib/api'
import live from 'lib/live'
import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import { CF_SIDE_T, CF_SIDE_CT } from 'constants/coinflip'
import style from './style.css'

export default class CreateFlip extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      side: CF_SIDE_T,
      tokens: 1,
      loading: false,
      skins: [],
      selected: [],
      subtotal: 0,
      tradeOffer: null,
      settings: {
        minimumBet: 1,
        maxSkins: 12
      }
    }
  }

  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      container: false,
      stack: true
    })

    this._modal.$el.on('hide', () => {
      this.setState({
        loading: false,
        tradeOffer: null,
        subtotal: 0,
        selected: [],
        skins: []
      })

      this.props.onHide()
    })

    this._modal._callReady()

    if(this.props.visible) {
      this._modal.show()
    }
    this._onTradeOfferChanged = offer => {
      const { tradeOffer } = this.state
      if(tradeOffer && offer.id === tradeOffer.id) {
        if(offer.state === 'ACCEPTED') {
          this.props.onHide(!!this.props.joinGame ? this.props.joinGame.id : null)
          return
        }

        this.setState({
          tradeOffer: {
            ...tradeOffer,
            ...offer
          }
        })
      }
    }

    live.on('tradeOfferChanged', this._onTradeOfferChanged)
  }

  componentWillUnmount() {
    live.removeListener('tradeOfferChanged', this._onTradeOfferChanged)
  }

  componentWillReceiveProps(nextProps) {
    const { visible } = nextProps
    if(this.props.visible !== visible) {
      if(visible) {
        this._refresh(true)
        this._modal.show()
      } else {
        this.setState({
          loading: false,
          tradeOffer: null,
          subtotal: 0,
          selected: [],
          skins: []
        })

        this._modal.hide()
      }
    }
  }

  render() {
    const { joinGame } = this.props
    let { skins, loading, side, tokens, busy, settings, selected, subtotal, tradeOffer } = this.state

    const canJoin = !!joinGame ? subtotal >= joinGame.range[0] && subtotal <= joinGame.range[1] : true

    if(!!joinGame) {
      side = joinGame.creator.side === CF_SIDE_T ? CF_SIDE_CT : CF_SIDE_T
    }

    return (
      <div className="coinflip" ref="modal">
        <div className="uk-modal-dialog uk-modal-body">
          <div className="uk-flex uk-flex-center uk-flex-middle uk-margin-bottom">
            <div className="uk-text-center uk-margin-small-right"><img className={style.coinflipLogo} width="80" src={require('assets/image/games/coin_flip.png')} /></div>
          </div>

          <div className="uk-flex uk-flex-middle">
            <div className={cn('uk-flex-1 uk-text-center', { 'uk-text-danger': !canJoin, 'uk-text-success': !!joinGame ? canJoin : false })}>
              <div className={style.wager}><AnimatedCount value={subtotal} /> T</div>
              { !joinGame ? <span>{numeral(settings.minimumBet).format('0,0.00')}T min.</span> : <span>{numeral(joinGame.range[0]).format('0,0.00')}T - {numeral(joinGame.range[1]).format('0,0.00')}T</span> }, {settings.maxSkins} skins max.
            </div>
            <div className="uk-flex-1">
              <div className={style.teams}>
                <div className={cn(style.teamT, { [style.teamActive]: side === CF_SIDE_T })} onClick={() => this._changeSide('T')}>
                  <img src={require('../assets/coin-t-big.png')} />
                  <span>0-50</span>
                </div>
                <div className={cn(style.teamCT, { [style.teamActive]: side === CF_SIDE_CT })} onClick={() => this._changeSide('CT')}>
                  <img src={require('../assets/coin-ct-big.png')} />
                  <span>50-100</span>
                </div>
              </div>
            </div>
          </div>

          <div className={style.skins}>
            { loading ? <Spinner /> : null }

            { !tradeOffer ? skins.map(s =>
              <div key={s.assetId} className={cn(style.skin, {[style.skinActive]: selected.indexOf(s.assetId) >= 0})} onClick={() => this._toggle(s)}>
                <img src={s.icon} />
                <div className={style.skinName}>{s.name}</div>
                <div className={style.skinPrice}>{numeral(s.tokens).format('0,00.00')}T</div>
              </div>
            ) : <div className="uk-text-center">

              { tradeOffer.state !== 'DECLINED' ? <h1 className="uk-margin-remove">{tradeOffer.securityToken}</h1> : <div>
                { tradeOffer.hasError ? <div className="uk-text-danger">{tradeOffer.error}</div> : <div>Your offer was declined</div> }
              </div> }

              <div className="uk-margin-bottom uk-margin-top">
                { tradeOffer.state === 'QUEUED' ? <Spinner /> : null }
                { tradeOffer.state === 'SENT' ? <a target="_blank" href={tradeOffer.tradeOfferUrl} className="uk-button uk-button-primary uk-button-large"><i className="fa fa-link" /> Accept Trade Offer</a> : null }
                { tradeOffer.state === 'DECLINED' ? <button className="uk-button uk-button-default uk-button-large" onClick={::this._retry}><i className="fa fa-refresh" /> Try Again</button> : null }
              </div>

              <div className="uk-text-muted">
                Sending your offer... please make sure the security token matches the one above
              </div>

            </div> }

            {!loading && !skins.length ? <div>Cannot find any tradeable items in your inventory</div> : null}
          </div>

          { !tradeOffer ? <div className="uk-flex uk-flex-middle uk-margin-top">
            <div className="uk-flex-1">
              <button disabled={loading || busy} onClick={() => this._refresh(true)} className="uk-button uk-button-default">Refresh Inventory</button>
            </div>
            <div className="uk-flex-1 uk-text-right">
              { !busy ? <button disabled={loading || busy} onClick={() => this.props.onHide()} className="uk-button uk-button-default uk-margin-small-right">Cancel</button> : null }
              { !busy ? <button disabled={loading || busy || subtotal <= settings.minimumBet || !canJoin} onClick={::this._createGame} className="uk-button uk-button-primary">{!joinGame ? 'Create Game' : 'Join Game'}</button> : <Spinner /> }
            </div>
          </div> : null }
        </div>
      </div>
    )
  }

  _retry() {
    this.setState({
      busy: false,
      tradeOffer: null
    })
  }

  _toggle(s) {
    let { selected, skins } = this.state

    const idx = selected.indexOf(s.assetId)
    if(idx >= 0) {
      selected.splice(idx, 1)
    } else {
      selected.push(s.assetId)
    }

    this.setState({
      selected,
      subtotal: skins.filter(s => selected.indexOf(s.assetId) >= 0).reduce((t, s) => t + s.tokens, 0)
    })
  }

   _refresh(update) {
     this.setState({
       loading: true
     })

     api(`inventory${update ? '?refresh=1' : ''}`)
       .then(result => {
         this.setState({
           skins: result.sort(this._sort),
           selected: [],
           loading: false
         })
       })

     .then(() => this.setState({
       loading: false
     }))
  }

  _sort(a, b) {
    return b.tokens - a.tokens
  }

  _changeSide(side) {
    if(this.state.busy || !!this.state.tradeOffer || !!this.props.joinGame) {
      return
    }

    this.setState({ side })
  }

  _createGame(e) {
    e.preventDefault()

    const { side, selected } = this.state
    this.setState({ busy: true })

    this.props

      .onCreate({
        side,
        items: selected
      })

      .then(result => {
        this.setState({
          ...result,

          busy: false
        })
      }, () => {
        this.setState({
          busy: false
        })
      })
  }
}

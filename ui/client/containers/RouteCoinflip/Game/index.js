
import React from 'react'
import cn from 'classnames'
import moment from 'moment'

import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import { CF_STATE_JOINED, CF_STATE_OVER, CF_STATE_WAITING_JOIN, CF_STATE_JOINING, CF_STATE_FLIPPING } from 'constants/coinflip'
import Panel from './Panel'
import Timer from './Timer'
import Coinflip from './Coinflip'
import style from './style.css'

export default class Game extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      container: false,
      stack: true
    })

    this._modal.$el.on('hide', () => {
      this.props.onHide()
    })

    this._modal._callReady()
    this._modal.show()
  }

  render() {
    const { currentUser, id, state, creator, against, expiration, subtotal, hash, secret, flipAt, showJoin, winnerSide, percentage, joinTradeOfferUrl, joinExpiration } = this.props

    return (
      <div ref="modal" className="uk-modal-full">
        <div className={cn('uk-modal-dialog uk-height-1-1', style.modalBody)}>
          <div className={style.container}>
            <div className={style.controls}>
              <div className={style.stake}>
                <div><img src={require('assets/image/token.png')} width="25" className="uk-margin-small-right" style={{ marginBottom: 5 }}/></div>
                <div><AnimatedCount value={subtotal} initial={false} />T Coin Flip</div>
              </div>
              <div className="uk-flex uk-flex-1 uk-text-right uk-margin-right uk-flex-middle uk-flex-right">
                <button type="button" className="uk-modal-close uk-button uk-button-link uk-text-muted uk-padding-left uk-padding-right"><i className="fa fa-close" /> Close Game</button>
              </div>
            </div>
            <div className={style.content}>
              <div className="uk-flex uk-flex-1 uk-height-1-1">
                <Panel {...creator} state={state} currentUser={currentUser} />
              </div>
              <div className={style.versus}>{ state === CF_STATE_WAITING_JOIN ? 'vs.' : state !== CF_STATE_JOINED && winnerSide ?
                <div>
                  <Coinflip side={winnerSide} />
                  <div className="uk-margin-top">
                    <button type="button" className="uk-modal-close uk-button uk-button-link uk-padding-left uk-padding-right uk-text-muted">Close Game</button>
                  </div>
                </div> : <Timer date={state === CF_STATE_JOINING ? joinExpiration : flipAt} showDetails={state === CF_STATE_JOINING} /> }</div>
              <div className={cn('uk-flex uk-flex-right uk-flex-1 uk-height-1-1', { 'uk-flex-middle': state === CF_STATE_WAITING_JOIN })}>
                { state !== CF_STATE_WAITING_JOIN ? <Panel {...against} state={state} currentUser={currentUser} joinTradeOfferUrl={joinTradeOfferUrl} reverse /> :
                  <div className="uk-width-1-1 uk-text-center">
                    <h3 className="uk-margin-remove"><Spinner /> Waiting for opponent...</h3>
                    <div className="uk-text-muted">Expires at {moment(expiration).format('MMMM DD, h:mm:ssA')}</div>
                    { showJoin ? <button className="uk-button uk-button-primary uk-margin-large-top uk-text-bold" onClick={::this._onJoin}>Join Game</button> : null }
                  </div>}
              </div>
            </div>
            <div className="uk-flex uk-flex-middle uk-padding-small">
              <div className={cn('uk-flex-1 uk-text-center', { 'uk-text-muted': state !== CF_STATE_OVER, 'uk-text-success': state === CF_STATE_OVER })}><i className="fa fa-lock" /> Hash: {hash}</div>
              { state === CF_STATE_OVER ? <div className="uk-flex-1 uk-text-center uk-text-success">Percentage: {percentage}%</div> : null }
              { state === CF_STATE_OVER ? <div className="uk-flex-1 uk-text-center uk-text-success"><i className="fa fa-key" /> Secret: {secret}</div> : null }
            </div>
          </div>
        </div>
      </div>
    )
  }

  _onJoin(e) {
    e.preventDefault()
    this.props.onJoin()
    this._modal.hide()
  }
}

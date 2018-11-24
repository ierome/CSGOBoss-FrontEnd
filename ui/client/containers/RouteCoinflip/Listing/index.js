
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import { CF_STATE_WAITING_JOIN, CF_STATE_OVER, CF_STATE_JOINED, CF_SIDE_T, CF_SIDE_CT, CF_STATE_FLIPPING } from 'constants/coinflip'
import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'

import Timer from '../Game/Timer'
import Coinflip from '../Game/Coinflip'
import style from './style.css'

const sideImages = {
  [CF_SIDE_T]: require('../assets/coin-t-big.png'),
  [CF_SIDE_CT]: require('../assets/coin-ct-big.png'),
}

export default class Listing extends React.Component {
  render() {
    const { state, percentage, secret, hash, creator, against, subtotal, showJoin, flipAt, winnerSide, items, winner, _newGame, creatorItems, range, _removing, hideControls, showSecret } = this.props

    return (
      <div className={cn(style.container, _newGame ? style.newListing : null, _removing ? style.deleting : null)} style={{ borderLeftColor: creator.color }}>
        <div className={style.overlay} />
        <div className={style.players}>
          <div className={cn(style.avatarContainer, { [style.faded]: state === CF_STATE_OVER && winnerSide && winnerSide !== creator.side })}>
            <img className={style.avatar} src={creator.avatar} />
            <img className={style.avatarSide} src={sideImages[creator.side]} />
          </div>
          <div className="uk-margin-left uk-margin-right uk-text-bold">vs.</div>
          <div className={cn(style.avatarContainer, { [style.faded]: state === CF_STATE_OVER && winnerSide && winnerSide !== against.side })}>
            { state === CF_STATE_WAITING_JOIN ? <img className={style.waitingJoin} src={require('../assets/0820-question.png')} width="25" /> :
              <img className={style.avatar} src={against.avatar} /> }
            <img className={style.leftAvatarSide} src={sideImages[against.side]} />
          </div>
        </div>
        <div className={style.items}>
          {items.map((item, i) =>
            <img key={item.id} src={item.icon} />
          )}
        </div>
        <div className="uk-flex uk-flex-middle uk-margin-large-left uk-flex-1 uk-flex-right uk-text-right">
          <div className={style.stake}>
            <div className="uk-flex uk-flex-middle uk-flex-right uk-text-right"><img src={require('assets/image/token.svg')} /><AnimatedCount value={subtotal} initial={!_newGame} />T</div>
            { state !== CF_STATE_OVER ? <div className={style.stakeRange}>{numeral(range[0]).format('0,00.00')}T - {numeral(range[1]).format('0,00.00')}T</div> : null }
          </div>
        </div>
        <div className={style.controls}>
          { state === CF_STATE_FLIPPING || state === CF_STATE_JOINED ? <div className="uk-flex uk-flex-middle uk-margin-right uk-text-right uk-flex-right uk-flex-1 uk-text-bold">
            <Timer date={flipAt} />
          </div> : null }
          { state === CF_STATE_OVER ? <div className="uk-flex uk-flex-middle uk-text-right uk-flex-right uk-flex-1">
            <img src={sideImages[winnerSide]} width="50" className="uk-margin-small-right" />
            { state === CF_STATE_JOINED ? <div className={style.avatarContainer}>
              <img className={style.avatar} src={winner.avatar} />
            </div> : null }
          </div> : null }
          { !hideControls ? <div className="uk-flex uk-flex-middle uk-text-right uk-margin-left uk-flex-right">
            <button className="uk-button uk-button-primary uk-button-small uk-margin-small-right uk-text-bold" onClick={this.props.onWatch}>Watch</button>
            { showJoin ? <button className="uk-button uk-button-secondary" onClick={this.props.onJoin}>Join</button> : null }
          </div> : null }
        </div>

        { _removing ? <div className={style.deleteNotice}><Spinner /></div> : null }
        { showSecret ? <div className={style.secret}>
          <div>Hash: {hash}</div>
          <div>Secret: {hash}</div>
          <div>Percentage: {hash}</div>
        </div> : null }
      </div>
    )
  }
}

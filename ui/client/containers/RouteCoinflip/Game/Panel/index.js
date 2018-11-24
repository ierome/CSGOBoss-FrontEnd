
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import Spinner from 'components/Spinner'
import { CF_STATE_WAITING_JOIN, CF_STATE_JOINING, CF_STATE_OVER, CF_STATE_JOINED, CF_STATE_FLIPPING, CF_SIDE_T, CF_SIDE_CT, CF_SIDE_PERCENT } from 'constants/coinflip'
import style from './style.css'

const sideImages = {
  [CF_SIDE_T]: require('../../assets/coin-t-big.png'),
  [CF_SIDE_CT]: require('../../assets/coin-ct-big.png'),
}


export default class Panel extends React.Component {
  render() {
    const { currentUser, reverse, color, textColor, percentage, id, avatar, name, wager, side, items, joinTradeOfferUrl, state } = this.props

    const cl = cn(style.container, {
      [style.reverse]: reverse
    })

    return (
      <div className={cl}>
        <img className={style.avatar} src={avatar} />
        <h3><img src={sideImages[side]} /> {name}</h3>
        <span className="uk-text-muted">{numeral(wager).format('0,00.00')}T ({ state === CF_STATE_JOINED || state === CF_STATE_FLIPPING || state === CF_STATE_OVER ? `${numeral(percentage).format('00.00')}%` : CF_SIDE_PERCENT[side]})</span>
        <div className={style.items}>
          {!!items ? items.map((item, i) =>
            <div key={item.id} className={style.item}>
              <img src={item.icon} />
              <div className={style.itemPrice}>{numeral(item.price).format('0,00.00')}T</div>
              <div>{item.name}</div>
            </div>
          ) : null}
        </div>

        { !!currentUser && currentUser.id === id && reverse && state === CF_STATE_JOINING ? !!joinTradeOfferUrl ? <a href={joinTradeOfferUrl} target="_blank" className="uk-button uk-button-primary"><i className="fa fa-link" /> Open Trade Offer</a> : <Spinner /> : null }
      </div>
    )
  }
}


import React from 'react'

import { ITEM_WEAR } from 'constants/item'
import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

/*
{ false ?
  <p className="uk-text-muted uk-text-center">Add "csgoboss.com" to your name for a +2% deposit bonus!</p> :
  <h4 className="uk-text-center uk-text-success">+2% Deposit Bonus</h4> }
  */

export default class Cart extends React.Component {
  render() {
    const { loading, skins } = this.props
    const total = skins.reduce((t, s) => t + s.tokens, 0)

    return (
      <div className={style.container}>
        <div className={style.skins}>
          {skins.map(skin =>
            <div key={skin.assetId} className={style.skin}>
              <h5>
                <img src={skin.icon} />
                {skin.cleanName}
                <div className={style.skinInfo}>{ITEM_WEAR[skin.wear]}</div>
                <div className={style.skinPrice}>+ <AnimatedCount value={skin.tokens} initial={false} /></div>
              </h5>
              <div className="uk-clearfix" />
            </div>
          )}
        </div>
        <div className={style.footer}>
          <table className="uk-width-1-1">
            <tbody>
              <tr>
                <td><h3>Total</h3></td>
                <td className="uk-text-right"><h3><img src={require('assets/image/token.png')} width="20" /> <AnimatedCount value={total} /></h3></td>
              </tr>
            </tbody>
          </table>
          <button disabled={loading || total <= 0} className="uk-button uk-button-primary uk-button-large uk-margin-small-bottom uk-width-1-1" onClick={this.props.onConfirm}>{this.props.confirmText}</button>
          <div className="uk-grid uk-grid-small">
            <div className="uk-width-1-3">
              <button disabled={loading} className="uk-button uk-button-secondary uk-width-1-1" onClick={this.props.onRefresh}><i className="fa fa-refresh" /></button>
            </div>
            <div className="uk-width-2-3">
              <button disabled={loading || !skins.length} className="uk-button uk-button-secondary uk-width-1-1" onClick={this.props.onClear}>Clear Cart</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

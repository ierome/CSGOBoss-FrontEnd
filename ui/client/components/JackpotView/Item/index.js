
import React, { Component } from 'react'
import numeral from 'numeral'

import style from './style.css'

const wear = {
  'Vanilla': '',
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS'
}

class Item extends Component {
  static contextTypes = {
    convertTokens: React.PropTypes.func
  }

  constructor(props) {
    super(props)
  }

  render() {
    const { item, currencyFormat } = this.props
    return (
      <div className={style.normal}>
        <div className="row">
          <div className="col-md-4"><span className={style.wear}>{wear[item.wear]}</span></div>
          <div className="col-md-8"><span className={style.price}>{numeral(this.context.convertTokens(item.tokens)).format(currencyFormat)}</span></div>
        </div>
        <img src={item.icon} />
        <h5>{item.name}</h5>
      </div>
    )
  }
}

export default Item


import React from 'react'
import cn from 'classnames'

import style from './style.css'

export default class PayCheck extends React.Component {
  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      center: true
    })[0]

    this._modal._callReady()
    this._modal.show()
  }

  render() {
    return (
      <div className={style.container}>
        <i className="fa fa-info-circle" /> Good News! BOSS PAYCHECKS are on the way!
        <button className="uk-button uk-button-secondary uk-button-small uk-text-bold">CLAIM IT</button>

        <div ref="modal">
          <div className={cn('uk-modal-dialog uk-modal-body', style.payCheck)}>
            <div className="uk-flex uk-child-width-expand">
              <div>
                <h4 className="uk-text-bold">CSGOBOSS</h4>
                <h6 className="uk-text-bold">www.csgoboss.com</h6>
              </div>
              <div className="uk-position-relative uk-text-right">
                <div className={style.topRightStamp}>1011011</div>
                Date: <span className={style.date}>January 20, 2017</span>
              </div>
            </div>
            <div className={style.payToOrderOf}>
              <h4>Pay to the order of:</h4>
              <div className={style.payToOrderOfName}>Joseph - Minesweeper.GG</div>
            </div>
            <div className="uk-text-center">
              <button className="uk-button uk-button-secondary"><i className="fa fa-pencil" /> CLAIM CHECK</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

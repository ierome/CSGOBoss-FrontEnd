
import React, { Component } from 'react'
import cn from 'classnames'
import numeral from 'numeral'
import plural from 'pluralize'

import Spinner from 'components/Spinner'

import Expires from './Expires'
import style from './style.css'

class DepositItem extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false
    }
  }

  render() {
    const { offer } = this.props
    const { loading } = this.state

    const classList = cn(style.normal, {
      [style.loading]: loading
    })

    return (
      <div className={classList}>
        <Expires to={offer.expiration} />
        <h3>Confirm Deposit</h3>
        <p>You sent us {offer.itemNames.length} {plural('item', offer.itemNames.length)} valued at ${numeral(offer.price).format('0,0.00')}. Please confirm your offer.</p>
        { !loading ? <div className="uk-text-center">
          <button className="uk-button uk-button-default" disabled={loading} onClick={::this._onCancel}>Cancel</button>
          <button className="uk-button uk-button-default" onClick={::this._onConfirm}><i className="fa fa-check" /> Confirm</button>
        </div> : <div className="uk-text-center"><Spinner /></div> }
      </div>
    )
  }

  _onCancel() {
    const { loading } = this.state
    if(loading) {
      return
    }

    this.setState({ loading: true })

    fetch(`/api/offers/cancel/${this.props.offer.id}`, {
      method: 'POST',
      credentials: 'same-origin'
    })

    .then(r => r.json())
    .then(({ success, error }) => {
      if(!success) {
        UIkit.notification({
          message: error,
          status: 'error'
        })

        this.setState({ loading: false })
      }
    })
  }

  _onConfirm() {
    const { loading } = this.state
    if(loading) {
      return
    }

    this.setState({ loading: true })

    fetch(`/api/offers/confirm/${this.props.offer.id}`, {
      method: 'POST',
      credentials: 'same-origin'
    })

    .then(r => r.json())
    .then(({ success, error }) => {
      if(!success) {
        UIkit.notification({
          message: error,
          status: 'error'
        })

        this.setState({ loading: false })
      }
    })
  }
}

export default DepositItem

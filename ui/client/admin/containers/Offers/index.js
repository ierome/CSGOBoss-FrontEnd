
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'
import numeral from 'numeral'
import moment from 'moment'
import ui from 'uikit'

import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'

class Offers extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      offers: []
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { params } = this.props
    const { busy, loading, offers } = this.state

    if(loading) {
      return (
        <div className={style.container}>
          <div className="uk-text-center"><Spinner /></div>
        </div>
      )
    }

    return (
      <div className={style.container}>
        <div className="uk-flex uk-flex-middle uk-flex-center uk-margin-large-bottom uk-margin-top">
          <div className="uk-flex-1">
            <h2 className="uk-margin-remove"><Link className="uk-text-success" to="/"><i className="fa fa-steam" /> {params.id}</Link></h2>
            <div className="uk-text-muted">Trade Offers</div>
          </div>
          <div className="uk-flex-1 uk-text-right">
            <button disabled={busy} className="uk-button uk-button-primary" onClick={::this._refresh}>Refresh</button>
          </div>
        </div>
        <div className="uk-grid">
          {offers.map(offer =>
            <div key={offer.id} className="uk-width-1-1">
              <div className={style.panel}>
                <h1 className="uk-text-center uk-margin-remove uk-text-danger">{numeral(offer.subtotalPrice || offer.subtotal).format('$0,0.00')}</h1>
                <div className="uk-text-center uk-text-muted">{moment(offer.createdAt).format('MM/DD/YYYY')} &middot; {offer.type}</div>
                <table className="uk-table uk-table-striped">
                  <thead>
                    <tr>
                      <td width="25%">Key</td>
                      <td>Value</td>
                    </tr>
                  </thead>
                  <tbody>
                    {_.map(offer, (v, k) =>
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{JSON.stringify(v)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                { offer.type === 'DEPOSIT' && offer.state === 'ACCEPTED' ? <button onClick={e => this._refund(e, offer.id)} className="uk-button uk-button-default">Refund Deposit</button> : null }

              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  _refund(e, id) {
    e.preventDefault()

    this.setState({
      busy: true
    })

    api('admin/offers/refund', {
      body: {
        id
      }
    }).then(response => {
      ui.notification({
        status: 'success',
        message: 'Refund offer has been queued'
      })

      this._refresh()
    })
  }

  _refresh() {
    this.setState({
      busy: true
    })

    api('admin/offers/' + this.props.params.id).then(response => {
      this.setState({
        busy: false,
        loading: false,
        offers: response.offers
      })
    })
  }
}

export default Offers

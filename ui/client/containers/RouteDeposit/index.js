
import React, { Component } from 'react'
import { connect } from 'react-redux'

import SkinSelectView from 'components/SkinSelectView'
import Spinner from 'components/Spinner'

import api from 'lib/api'
import live from 'lib/live'

class RouteDeposit extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      skins: [],

      queueing: false,
      tradeOfferUrl: '',
      tradeOffer: null
    }
  }

  componentDidMount() {
    this._refresh()

    this._modal = UIkit.modal(this.refs.modal, {
      center: true
    })

    this._modal._callReady()

    this._onTradeOfferChanged = offer => {
      const { tradeOffer } = this.state
      if(tradeOffer && offer.id === tradeOffer.id) {
        if(offer.hasError) {
          this._refresh()
        }

        this.setState({
          tradeOffer: {
            ...tradeOffer,
            ...offer
          },

          tradeOfferUrl: offer.tradeOfferUrl || ''
        })
      }
    }

    // // Listen for new trade offer
    live.on('tradeOfferChanged', this._onTradeOfferChanged)
  }

  componentWillUnmount() {
    live.removeListener('tradeOfferChanged', this._onTradeOfferChanged)
  }

  render() {
    const { currentUser } = this.props
    const { loading, skins, tradeOfferUrl, tradeOffer } = this.state

    return (
      <div>
        <SkinSelectView
          currentUser={currentUser}
          loading={loading}
          skins={skins}
          onRefresh={() => this._refresh(true)}
          onConfirm={::this._requestDeposit} />

          <div ref="modal">
            <div className="uk-modal-dialog uk-modal-body">
              { tradeOffer ? <h2 className="uk-modal-title uk-text-center"><i className="fa fa-lock" /> {tradeOffer.securityToken}</h2> : null }

              { !tradeOfferUrl.length ?
                  tradeOffer && tradeOffer.hasError ?
                    <p className="uk-text-center uk-text-danger">There was a problem sending your trade offer, please try again in a couple minutes.</p> :
                    <p className="uk-text-center"><Spinner /> One sec pls... lazy a#$ Jake is creating your trade offer =^)</p> :
                  <a href={tradeOfferUrl} target="_blank" className="uk-button uk-button-large uk-button-primary uk-width-1-1" onClick={() => this._modal.hide()}><i className="fa fa-link" /> Open Trade Offer</a> }

              { tradeOffer ? <p className="uk-margin-top uk-text-muted uk-text-center">Reference #{tradeOffer.id}<br /><small>Make sure to check that the security token above matches the trade offer message!</small></p> : null }
            </div>
          </div>
      </div>
    )
  }

  _filter(skin) {
    return true
  }

  _sort(a, b) {
    return b.tokens - a.tokens
  }

  _refresh(update) {
    this.setState({
      loading: true
    })

    console.log('test')

    api(`inventory${update ? '?refresh=1' : ''}`)
      .then(result => {
      //   if(!success) {
      //     UIkit.notification({
      //       message: error,
      //       status: 'error',
      //       pos: 'bottom-right'
      //     })
      //
      //     return
      //   }
      //
        if(update) {
          UIkit.notification({
            message: 'Inventory updated!',
            status: 'success',
            pos: 'bottom-right'
          })
        }

        this.setState({
          skins: result.sort(this._sort),
          loading: false
        })
      })

      .then(() => this.setState({
        loading: false
      }))
  }

  _requestDeposit(selected) {
    this.setState({
      tradeOfferUrl: '',
      tradeOffer: null,
      loading: true
    })

    api('inventory/deposit', {
      body: selected
    })

    .then(result => {
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
        tradeOffer: result.tradeOffer,
        skins: this.state.skins.filter(skin => selected.indexOf(skin.assetId) < 0)
      })

      this._modal.show()
    })

    .then(() => this.setState({ loading: false }))
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteDeposit)

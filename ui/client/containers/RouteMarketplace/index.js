
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import numeral from 'numeral'

import SkinSelectView from 'components/SkinSelectView'
import Spinner from 'components/Spinner'
import live from 'lib/live'
import api from 'lib/api'

import style from './style.css'

class RouteMarketplace extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      searchLoading: false,
      search: '',
      skins: [],
      lowHigh: false,

      page: 1,
      pages: 0,
      totalItems: 0,

      tradeOffers: [],
      step: 0
    }
  }

  componentDidMount() {
    this._refresh()

    this._modal = UIkit.modal(this.refs.modal, {
      center: true
    })

    this._modal._callReady()

    this._onTradeOfferChanged = offer => {
      const { tradeOffers } = this.state
      this.setState({
        tradeOffers: tradeOffers.map(o => {
          if(o.id !== offer.id) {
            return o
          }

          return {
            ...o,
            ...offer
          }
        })
      })

      // const { tradeOffer } = this.state
      // if(tradeOffer && offer.id === tradeOffer.id) {
      //   if(offer.hasError) {
      //     this._refresh()
      //   }
      //
      //   this.setState({
      //     tradeOffer: {
      //       ...tradeOffer,
      //       ...offer
      //     },
      //
      //     tradeOfferUrl: offer.tradeOfferUrl || ''
      //   })
      // }
    }

    // Listen for new trade offer
    live.on('tradeOfferChanged', this._onTradeOfferChanged)
  }

  componentWillUnmount() {
    live.removeListener('tradeOfferChanged', this._onTradeOfferChanged)
  }

  render() {
    const { currentUser } = this.props
    const { loading, searchLoading, skins, tradeOffers, lowHigh } = this.state

    const hasPending = tradeOffers.filter(o => o.state === 'QUEUED').length > 0

    return (
      <div>
        <SkinSelectView
          currentUser={currentUser}
          loading={loading}
          searchLoading={searchLoading}
          skins={skins}
          onRefresh={() => this._refresh(1)}
          confirmText="Withdraw"
          onConfirm={::this._requestWithdraw}

          lowHigh={lowHigh}
          onToggleSort={::this._toggleSort}

          onSearch={::this._onSearch}
          hasMore={::this._hasMore}
          loadMore={::this._loadMore} />

          <div ref="modal">
            <div className="uk-modal-dialog uk-modal-dialog-large">
              <div className="uk-modal-body">
                <h2 className="uk-text-center uk-text-bold">Your skins are on the way!</h2>
                <table className="uk-table uk-table-middle">
                  <thead>
                    <tr>
                      <th width="30%" className="uk-text-center">State</th>
                      <th>Agent</th>
                      <th>Skins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeOffers.map(offer =>
                      <tr key={offer.id}>
                        <td className="uk-text-center">
                          { offer.state === 'SENT' ? <a target="_blank" href={offer.tradeOfferUrl} className="uk-button uk-button-primary uk-button-small"><i className="fa fa-link" /> Open</a> : null }
                          { !offer.state || offer.state === 'QUEUED' ? <span>QUEUED</span> : null }
                          { offer.state === 'WAITING_CONFIRMATION' ? <span>CONFIRMING</span> : null }
                          { offer.state === 'DECLINED' ? <span>DECLINED</span> : null }
                          { offer.state === 'ACCEPTED' ? <i className="fa fa-check uk-text-success" /> : null }
                        </td>
                        <td><div className={style.agentName}>{offer.botName}</div></td>
                        <td>{offer.skinsCount} ({numeral(offer.subtotal).format('0,0')}T)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="uk-modal-caption">Thanks for playing!</div>
            </div>
          </div>
      </div>
    )
  }

/*
<div className="uk-grid">
  <div className="uk-width-1-3">
    <div className={cn(style.step, {[style.stepActive]: step <= 0})}>
      <div>{ step === 0 ? <Spinner /> : <i className="fa fa-database" /> }</div>
      <h5>Queueing Offer</h5>
    </div>
  </div>
  <div className="uk-width-1-3">
    <div className={style.step}>
      <div>{ step === 1 ? <Spinner /> : <i className="fa fa-lock" /> }</div>
      <h5>Confirming Offer</h5>
    </div>
  </div>
  <div className="uk-width-1-3">
    <div className={style.step}>
      <div>{ step === 2 ? <Spinner /> : <i className="fa fa-envelope-o" /> }</div>
      <h5>Offer Sent!</h5>
    </div>
  </div>
</div>*/

  _toggleSort() {
    let { lowHigh } = this.state
    lowHigh = !lowHigh

    this.setState({
      lowHigh
    })

    this.state.lowHigh = lowHigh
    this._refresh(1)
  }

  _onSearch(search) {
    if(this._searchTimeout) {
      clearTimeout(this._searchTimeout)
    }

    this.setState({
      search,
      searchLoading: true
    })

    this._searchTimeout = setTimeout(() => {
      this.setState({ searchLoading: false })
      this._refresh(1)
    }, 1000)
  }

  _hasMore() {
    const { page, pages, loading } = this.state
    return !loading && page < pages
  }

  _loadMore() {
    const { page, loading, skins } = this.state
    if(loading || !skins.length) {
      return
    }

    this._refresh(page + 1, true)
  }

  _refresh(page, hideLoader) {
    if(!hideLoader) {
      this.setState({
        loading: true
      })
    }

    const { search, lowHigh } = this.state

    api(`marketplace?page=${page || 1}&order=${lowHigh ? 'ASC' : 'DESC'}${search.length ? `&search=${search}` : ''}`)
      .then(result => {
        const { page, pages, items, totalItems } = result

        this.setState({
          page,
          pages,
          totalItems,
          searchLoading: false,
          loading: false,
          skins: page <= 1 ? items : [...this.state.skins, ...items]
        })
      })
  }

  _requestWithdraw(selected) {
    api('marketplace/purchase', {
      body: selected
    })

    .then(result => {
      this._refresh(this.state.page)

      if(result.unavailable.length) {
        UIkit.notification({
          message: 'Sorry, some requested items were no longer available.',
          status: 'error',
          pos: 'bottom-right'
        })
      }

      if(!result.tradeOffers.length) {
        return
      }

      this.setState({
        tradeOffers: result.tradeOffers
      })

      this._modal.show()
    })

    .catch(err => {
      console.log(`_requestWithdraw() ${err}`)

      this.setState({
        searchLoading: false,
        loading: false
      })
    })
  }

  _sort(a, b) {
    return b.tokens - a.tokens
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteMarketplace)

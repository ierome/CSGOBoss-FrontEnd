
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'
import numeral from 'numeral'
import moment from 'moment'

import api from 'lib/api'
import Modal from 'components/Modal'
import Spinner from 'components/Spinner'
import CreateRaffle from './CreateRaffle'
import style from './style.css'

class Raffles extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      showCreate: false,
      raffles: []
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { showCreate, raffles, loading } = this.state

    return (
      <div className={style.container}>
        <div className="uk-flex uk-flex-middle">
          <h1>Raffles { loading ? <Spinner /> : null }</h1>
          <div className="uk-flex-1 uk-text-right">
            { !showCreate ? <button className="uk-button uk-button-secondary uk-button-small uk-margin-small-right" onClick={() => this.setState({ showCreate: true })}>Start New Raffle</button> : null }
            <button disabled={loading} className="uk-button uk-button-secondary uk-button-small" onClick={::this._refresh}>Refresh</button>
          </div>
        </div>

        { showCreate ? <CreateRaffle onClose={::this._onCreateRaffleClose} /> : null }

        <div className={style.panel}>
          <table className="uk-table uk-table-striped">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Entries</th>
                <th>Started At</th>
                <th>Ends At</th>
              </tr>
            </thead>
            <tbody>
              { !raffles.length ? <tr><td colSpan="4" className="uk-text-center">Nothing to display</td></tr> : null }
              {raffles.map(raffle =>
                <tr key={raffle.id} className={raffle.state === 'ACTIVE' ? '' : 'uk-text-muted'}>
                  <td>{numeral(raffle.tokenPrize).format('0,0.00')}T</td>
                  <td>{numeral(raffle.totalEntries).format('0,0.00')} ({numeral(raffle.totalTickets).format('0,0.00')})</td>
                  <td>{moment(raffle.createdAt).format('MM/DD/YYYY hh:mm a')}</td>
                  <td>{moment(raffle.endDate).format('MM/DD/YYYY hh:mm a')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  _refresh() {
    this.setState({
      loading: true
    })

    api('admin/raffles').then(({ raffles }) =>
      this.setState({
        raffles,
        loading: false
      })
    )
  }

  _onCreateRaffleClose(refresh) {
    this.setState({
      showCreate: false
    })

    if(refresh) {
      this._refresh()
    }
  }
}

export default Raffles

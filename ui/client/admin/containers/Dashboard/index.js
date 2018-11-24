
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'
import _ from 'underscore'

import Spinner from 'components/Spinner'
import FromNow from 'components/FromNow'
import AnimatedCount from 'components/AnimatedCount'

import api from 'lib/api'
import style from './style.css'

class Dashboard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      busy: false,

      floatingTokens: 0,
      playerCount: 0,
      stats: {}
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { busy, loading, stats, floatingTokens, playerCount } = this.state

    return (
      <div className="uk-padding uk-margin-top">
        <div className="uk-flex uk-text-center">
          <div className="uk-flex-1">
            <h3 className={cn('uk-margin-remove uk-text-bold', { 'uk-text-success': stats.totalProfit > 0, 'uk-text-danger': stats.totalProfit < 0 })}>$<AnimatedCount value={stats.totalProfit} format="0,0.00" /></h3>
            <span className="uk-text-muted">Estimated Profit</span>
          </div>
          <div className="uk-flex-1">
            <h3 className="uk-text-muted uk-margin-remove uk-text-bold"><AnimatedCount value={stats.playerCount} format="0,0" /></h3>
            <span className="uk-text-muted">Registered Players</span>
          </div>
          <div className="uk-flex-1">
            <h3 className="uk-text-muted uk-margin-remove uk-text-bold"><AnimatedCount value={stats.floatingTokens} format="0,0" /> ($<AnimatedCount value={floatingTokens} format="0,0.00" />)</h3>
            <span className="uk-text-muted">Floating Tokens</span>
          </div>
          <div className="uk-flex-1 uk-text-right">
            <button disabled={busy || loading} className="uk-button uk-button-primary" onClick={::this._refresh}><i className="fa fa-refresh" /> Refresh</button>
          </div>
        </div>
        <div className="uk-margin-large-top">
          <div className="uk-flex">
            <div className="uk-margin-large-right">
              <button disabled={busy} className="uk-button uk-width-1-1 uk-button-secondary" onClick={::this._addLog}>Add Log</button>
              <dl className={cn('uk-description-list uk-description-list-divider')}>
                <dt>Towers</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalTowersProfit > 0, 'uk-text-danger': stats.totalTowersProfit < 0 })}>$<AnimatedCount colored value={stats.totalTowersProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider')}>
                <dt>Colors</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalColorsProfit > 0, 'uk-text-danger': stats.totalColorsProfit < 0 })}>$<AnimatedCount colored value={stats.totalColorsProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider')}>
                <dt>Coinflip</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalCoinflipProfit > 0, 'uk-text-danger': stats.totalCoinflipProfit < 0 })}>$<AnimatedCount colored value={stats.totalCoinflipProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider')}>
                <dt>Jackpot</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalJackpotProfit > 0, 'uk-text-danger': stats.totalJackpotProfit < 0 })}>$<AnimatedCount colored value={stats.totalJackpotProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider uk-margin-large-top')}>
                <dt>Promo Codes</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalPromoCodeProfit > 0, 'uk-text-danger': stats.totalPromoCodeProfit < 0 })}>$<AnimatedCount colored value={stats.totalPromoCodeProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider')}>
                <dt>Referral Codes</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalReferralCodeProfit > 0, 'uk-text-danger': stats.totalReferralCodeProfit < 0 })}>$<AnimatedCount colored value={stats.totalReferralCodeProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider uk-margin-large-top')}>
                <dt>Daily Tokens</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalDailyClaimedProfit > 0, 'uk-text-danger': stats.totalDailyClaimedProfit < 0 })}>$<AnimatedCount colored value={stats.totalDailyClaimedProfit} format="0,0.00" /></dd>
              </dl>
              <dl className={cn('uk-description-list uk-description-list-divider uk-margin-large-top')}>
                <dt>Misc</dt>
                <dd className={cn('uk-text-bold', { 'uk-text-success': stats.totalMiscProfit > 0, 'uk-text-danger': stats.totalMiscProfit < 0 })}>$<AnimatedCount colored value={stats.totalMiscProfit} format="0,0.00" /></dd>
              </dl>
            </div>
            <div className={style.tableContainer}>
              <table className="uk-table">
                <thead>
                  <tr>
                    <th className="uk-text-muted" width="25%">Statistic</th>
                    <th className="uk-text-muted">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {_.map(stats, (value, key) =>
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{typeof value === 'number' ? numeral(value).format('0,0.00') : JSON.stringify(value)}</td>
                    </tr>
                  )}
                  { loading ? <tr>
                    <td colSpan="4" className="uk-text-center">
                      <Spinner />
                    </td>
                  </tr> : null }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  _addLog() {
    UIkit.modal.prompt('Amount to log:', '0').then(amount => {
      amount = parseFloat(amount)

      this.setState({
        busy: true
      })

      api('admin/logStatistic', {
        body: {
          amount: parseFloat(amount)
        }
      })

      .then(() => {
        UIkit.notification({
          status: 'info',
          message: `Logged ${numeral(amount).format('0,0.00')}T to statistics`
        })

        this.setState({
          busy: false
        })

        this._refresh()
      }, () => {
        this.setState({
          busy: false
        })
      })

    })
  }

  _toggle(id) {
    let { active } = this.state

    const idx = active.indexOf(id)
    if(idx >= 0) {
      active.splice(idx, 1)
    } else {
      active.push(id)
    }

    this.setState({
      active
    })

    this._refresh()
  }

  _refresh() {
    this.setState({ loading: true })

    api('admin/profit')
      .then(stats => {
        this.setState({
          stats,
          loading: false
        })
      })
  }
}

export default Dashboard

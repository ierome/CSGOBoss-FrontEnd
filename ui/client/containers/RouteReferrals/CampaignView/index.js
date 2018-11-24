import React from 'react'
import numeral from 'numeral'
import cn from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import api from 'lib/api'
import moment from 'moment'

import style from './style.css'

export default class CampaignView extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false
    }
  }

  render() {
    const { loading, currentUser, campaign } = this.props
    const { busy } = this.state

    return (
      <div className="uk-flex uk-flex-column uk-margin-bottom">
        <div className="uk-flex uk-margin-top">
          <div>
            <div className={style.widgets}>
              <div className={style.balanceWidget}>
                <div className={style.widgetValue}><img src={require('./assets/dollarbag.svg')} /> <AnimatedCount value={campaign.balance} colored />T</div>
                <div className={style.widgetName}>Affiliate Balance</div>
              </div>

              <button disabled={busy || loading } className={cn('uk-button uk-button-secondary uk-text-bold', style.withdrawButton)} onClick={::this._withdraw}>{ !busy ? 'Withdraw' : <Spinner /> }</button>
              { campaign.balance > 0 && campaign.balance < 0.50 ? <div className={style.minimumWithdrawInfo}>You need at least a 0.50 balance to withdraw available funds</div> : null }

              <div className={style.referralCodeWidget}>
                <div className={style.widgetName}>Referral Code</div>
                <div className={style.widgetValue}>{campaign.code}</div>
              </div>

              <div className={style.widget}>
                <div className={style.widgetName}>Code Reward Amount</div>
                <div className={style.widgetValue}><AnimatedCount value={campaign.reward} colored />T</div>
              </div>

              <div className={style.widget}>
                 <div className={style.widgetName}>Usage Commission</div>
                <div className={style.widgetValue}><AnimatedCount value={campaign.commission} colored />T</div>
              </div>

              <div className={style.widget}>
                 <div className={style.widgetName}>Deposit Commission</div>
                <div className={style.widgetValue}><AnimatedCount value={campaign.depositComission} format="0.00%" colored /></div>
              </div>

              <div className={style.widgetSplitter} />

              <div className={style.widget} style={{ background: 'none' }}>
                <div className={style.widgetValues}>
                  <div className={style.widgetValue}><AnimatedCount value={campaign.statsGrossProfit} colored />T<span className={style.subName}>Gross Profit</span></div>
                  <div className={style.widgetValue}><AnimatedCount value={campaign.statTotalDeposited} colored />T<span className={style.subName}>Total Deposited</span></div>
                  <div className={style.widgetValue}><AnimatedCount value={campaign.statTotalRedeemed} colored format="0,0" /><span className={style.subName}>Total Redemptions</span></div>
                  <div className={style.widgetValue}><AnimatedCount value={campaign.statTotalDeposits} colored format="0,0" /><span className={style.subName}>Total Deposits</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="uk-flex uk-flex-column uk-flex-1">
            <div className="uk-margin">
              <label><i className="fa fa-link" /> Your Unique URL</label>
              <div className="uk-inline uk-width-1-1">
                <input className="uk-input" type="text" defaultValue={`${window.location.origin}/promo/${campaign.code}`} readOnly />
              </div>
            </div>

            <div className={style.historyContainer}>

              { !campaign.activity.length ? <div className={style.historyContainerEmpty}>
                <div className={style.historyContainerEmptyHeader}><img src={require('./assets/wondering.svg')} /> No Recent Activity</div>
                <div className={style.historyContainerEmptyMessage}>O.K seriously, what are you waiting for? You can start sharing your referral code right NOW to start earning <b>free</b> tokens on every usage and deposit!</div>
              </div> : null }

              <div className={style.header}>
                <div className="uk-flex-1"><i className="fa fa-history" /> Recent Activity</div>
                <button disabled={loading} className="uk-button uk-button-primary uk-button-small" onClick={::this.props.onRefresh}><i className="fa fa-refresh" /> Refresh</button>
              </div>

              <table className="uk-width-1-1" cellSpacing="0" cellPadding="0">
                <tbody>
                  {campaign.activity.map(activity =>
                    <tr key={activity.id}>
                      <td>{moment(activity.createdAt).fromNow()}</td>
                      <td>+ <AnimatedCount value={activity.amount} />T</td>
                      <td>{activity.description}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    )
  }

  _withdraw(e) {
    e.preventDefault()

    this.setState({
      busy: true
    })

    api('affiliate/withdraw', {
      method: 'POST'
    })

    .then(() => {
      this.props.onUpdate({
        balance: 0
      })

      this.setState({
        busy: false
      })
    }, () =>
      this.setState({
        busy: false
      })
    )
  }
}

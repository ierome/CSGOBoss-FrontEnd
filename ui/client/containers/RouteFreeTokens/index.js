
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import moment from 'moment'
import numeral from 'numeral'
import Recaptcha from 'react-recaptcha'

import { updateUserAction } from 'actions/user'
import { TICK_SOUND, COIN_SOUND4 } from 'util/sounds'
import Spinner from 'components/Spinner'
import Progress from 'components/Progress'
import style from './style.css'
import comma from 'lib/comma'
import api from 'lib/api'

import CodeReward from './codeReward'
import SteamReward from './steamReward'
import DailyReward from './dailyReward'

class RouteFreeTokens extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: true,
      code: '',

      nextFreeDailyTokensAt: null,
      canClaimDailyTokens: false,
      redeemedSteamFollow: false,

      showCaptcha: false
    }
  }

  componentDidMount() {
    api('free-tokens')

    .then(result => {
      this.setState({
        busy: false,
        nextFreeDailyTokensAt: result.nextFreeDailyTokensAt,
        redeemedSteamFollow: result.redeemedSteamFollow
      })
    })

    .then(() => this.setState({ busy: false }))
  }

  render() {
    const { currentUser, params } = this.props
    const { busy, nextFreeDailyTokensAt, redeemedSteamFollow } = this.state

    return (
      <div className="uk-container uk-container-center uk-margin-top">

        <div className={style.header}>
          <img src={require('./assets/gift.svg')} />
          <div className={style.headerContent}>Rewards</div>
          <div className={style.headerSubtext}>Claim free tokens to get back in the game</div>
        </div>

        <div className={style.rewards}>
          <CodeReward params={params} />
          <DailyReward busy={busy} nextFreeDailyTokensAt={nextFreeDailyTokensAt} />
          <SteamReward redeemed={redeemedSteamFollow} />
        </div>

      </div>
    )

    return (
      <div className="uk-container uk-container-center uk-margin-top">
        <h1 className="uk-header-primary uk-margin-large-bottom uk-text-center">Free Tokens</h1>
        <div className="uk-grid uk-grid-match uk-margin-top">
          <div className="uk-width-1-2">
            <div className={style.reward}>
              <div className={style.rewardProgress}>
                <Progress value={100} text="???" />
              </div>
              <h3 className="uk-text-center">Enter a Code</h3>
              <button disabled={!currentUser || busy} className="uk-button uk-button-secondary uk-width-1-1 uk-margin-top uk-text-bold" onClick={::this._redeemCode}>Redeem</button>
            </div>
          </div>
          <div className="uk-width-1-2">
            <div className={style.reward}>
              <div className={style.rewardProgress}>
                <Progress value={100} text="5" />
              </div>
              <h3 className="uk-text-center">Join Steam Group</h3>
              <button disabled={!currentUser || busy || redeemedSteamFollow} className="uk-button uk-button-secondary uk-width-1-1 uk-margin-top uk-text-bold" onClick={::this._redeemSteamGroup}>Redeem</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  _verifyCaptcha(result) {
    this._redeemDaily(result)
  }

  _redeemCode() {
    UIkit.modal.prompt('Enter the code you would like to redeem:', '')
      .then(code => {
        this.setState({ busy: true })
        fetch(`/api/code/redeem/${code}`, {
          credentials: 'same-origin',
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        .then(r => r.json())
        .then(({ success, error, response }) => {
          if(!success) {
            return UIkit.notification({
                message: error,
                status: 'danger',
                pos: 'top-right',
                timeout: 5000
            })
          }

           UIkit.modal.alert(`You have been rewarded <b>+${comma(response.reward)}&#359;</b>!<p>Don't forget to share the code with your friends!</p>`)
        })

        .catch(err => {
          console.debug(err)
          UIkit.modal.alert('Something went wrong in the middle of redeeming the code. Please try again later or contact support if the problem persists.')
        })

        .then(() => this.setState({ busy: false }))
      })
  }

  _redeemDaily(captcha) {
    this.setState({ busy: true })

    fetch(`/api/free-tokens/claim-daily`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ captcha })
    })

    .then(r => r.json())
    .then(({ success, error, result }) => {
      if(!success) {
        return UIkit.notification({
            message: error,
            status: 'danger',
            pos: 'top-right',
            timeout: 5000
        })
      }

      this.setState({
        nextFreeDailyTokensAt: result.nextFreeDailyTokensAt,
        canClaimDailyTokens: false
      })

      UIkit.notification({
        message: `You have been rewarded ${numeral(result.reward).format('0,0')}T!`,
        status: 'success',
        pos: 'top-right',
        timeout: 5000
      })
    })

    .then(() => this.setState({ busy: false }))
  }

  _redeemSteamGroup() {
    this.setState({ busy: true })

    fetch(`/api/free-tokens/claim-steamfollow`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    .then(r => r.json())
    .then(({ success, error, result }) => {
      if(!success) {
        return UIkit.notification({
            message: error,
            status: 'danger',
            pos: 'top-right',
            timeout: 5000
        })
      }

      this.setState({ redeemedSteamFollow: true })
      UIkit.notification({
        message: `You have been rewarded ${numeral(result.reward).format('0,0')}T!`,
        status: 'success',
        pos: 'top-right',
        timeout: 5000
      })
    })

    .then(() => this.setState({ busy: false }))
  }

  _switchTab(e, tab) {
    e.preventDefault()
    this.setState({ tab })
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteFreeTokens)

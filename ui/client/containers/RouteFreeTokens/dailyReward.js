
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import Recaptcha from 'react-recaptcha'

import ui from 'uikit'
import api from 'lib/api'
import Spinner from 'components/Spinner'
import Progress from './Progress'
import style from './style.css'

export default class DailyReward extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      nextFreeDailyTokensAt: null,
      canClaimDailyTokens: false,
      canClaimDailyTokensIn: '',
      showCaptcha: false
    }
  }

  componentDidUpdate(prevProps) {
    if(this.props.nextFreeDailyTokensAt !== prevProps.nextFreeDailyTokensAt) {

      this.setState({
        nextFreeDailyTokensAt: this.props.nextFreeDailyTokensAt,
        canClaimDailyTokens: false
      })
    }
  }

  render() {
    const { busy, nextFreeDailyTokensAt, canClaimDailyTokens, showCaptcha } = this.state

    return (
      <div className={style.reward}>
        { busy || this.props.busy ? <div className={style.rewardLoader}><Spinner size={50} /></div> : null }
        <div className={style.rewardName}><img src={require('./assets/diamond.svg')} /> Daily Reward</div>
        <div className={style.rewardDescription}>Claim your free daily tokens</div>
        <div className={style.rewardContent}>
          { canClaimDailyTokens ? <div>
            { !showCaptcha ? <button disabled={busy || !canClaimDailyTokens} className="uk-button uk-button-secondary uk-width-1-1" onClick={() => this.setState({ showCaptcha: true })}>Redeem Reward</button> :
              <Recaptcha sitekey="6LenvxcUAAAAABM9bm0iC789DpkjG_U4duQaMddo"
                ref={e => this.recaptchaInstance = e}
                size="small"
                render="explicit"
                onloadCallback={() => {}}
                verifyCallback={::this._verifyCaptcha} />
            }
          </div> :
          <Progress value={100} text="25" endDate={nextFreeDailyTokensAt} onTimerFinished={() => this.setState({ canClaimDailyTokens: true })} />
          }

        </div>
      </div>
    )
  }

  _verifyCaptcha(captcha) {
    this.setState({
      showCaptcha: false,
      busy: true
    })

    api('free-tokens/claim-daily', {
      method: 'POST',
      body: {
        captcha
      }
    })

    .then(({ nextFreeDailyTokensAt }) => {
      ui.notification({
        status: 'success',
        message: 'Daily tokens have been claimed!'
      })

      this.setState({
        nextFreeDailyTokensAt,

        busy: false,
        canClaimDailyTokens: false
      })
    }, () => {
      this.setState({
        busy: false
      })
    })
  }

  _redeem() {
    this.setState({
      busy: true
    })

    api('free-tokens/claim-steamfollow', {
      method: 'POST'
    })

    .then(() => {
      ui.notification({
        status: 'success',
        message: 'Reward has been claimed!'
      })

      this.setState({
        busy: false
      })
    }, () => {
      this.setState({
        busy: false
      })
    })
  }
}

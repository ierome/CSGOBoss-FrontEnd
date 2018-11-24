
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'

import ui from 'uikit'
import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'

export default class SteamReward extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false
    }
  }

  render() {
    const { redeemed } = this.props
    const { busy } = this.state

    return (
      <div className={cn(style.reward, redeemed ? style.rewardRedeemed : null)}>
        { busy ? <div className={style.rewardLoader}><Spinner size={50} /></div> : null }

        <div className={style.rewardName}><img src={require('./assets/steam.svg')} /> Steam Follow</div>
        <div className={style.rewardDescription}>Simply follow our Steam group</div>
        <div className={style.rewardContent}>
          <button disabled={busy} className="uk-button uk-button-secondary uk-width-1-1" onClick={::this._redeem}>Redeem Reward</button>
        </div>
      </div>
    )
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

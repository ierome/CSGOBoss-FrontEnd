
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'

import ui from 'uikit'
import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'

export default class CodeReward extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      code: props.params.promo || ''
    }
  }

  componentDidMount() {
    if(this.state.code.length > 0) {
      this._redeem()
    }
  }

  render() {
    const { params } = this.props
    const { busy, code } = this.state

    return (
      <div className={style.reward}>
        { busy ? <div className={style.rewardLoader}><Spinner size={50} /></div> : null }
        <div className={style.rewardName}><img src={require('./assets/keyboard.svg')} /> Promo Code</div>
        <div className={style.rewardDescription}>Enter an affiliate or promo code below</div>
        <div className={style.rewardContent}>
          <input type="text" placeholder="ENTER CODE" value={code} onChange={e => this.setState({ code: e.target.value })} />
          <button disabled={busy || code.length <= 0} className="uk-button uk-button-secondary uk-width-1-1" onClick={::this._redeem}>Redeem Code</button>
        </div>
      </div>
    )
  }

  _redeem() {
    this.setState({
      busy: true
    })

    api(`affiliate/redeem`, {
      method: 'POST',
      body: {
        code: this.state.code
      }
    })

    .then(() => {
      ui.notification({
        status: 'success',
        message: 'Code has been successfully applied!'
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

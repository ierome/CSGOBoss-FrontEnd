
import React, { Component } from 'react'

import style from './style.css'

class Deposit extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      tradeUrl: '',
      error: null
    }
  }

  componentDidMount() {
    this._loadTradeLink()
  }

  render() {
    const { session } = this.props
    const { loading, tradeUrl, error } = this.state

    return (
      <div>
        { !error ? <a disabled={loading} className={style.normal} href={tradeUrl} target="_blank" onClick={::this._showTip}>{!loading ? <span><i className="fa fa-circle fa-plus" /> Deposit Skins</span> : 'Loading...'}</a>
          : <button disabled className={style.normal} href="#" onClick={::this._showTip}>{error}</button> }
        <a className={style.help} href="#" onClick={::this._showRules}>View Deposit Rules</a>
        { session && session.get('user') && !session.getIn(['user', 'tradeLink']) ? <div className={style.tradeNotice}><b>Please set your trade link in the settings before depositing!</b></div> : null }
      </div>
    )
  }

  _showTip(e) {
    const { session } = this.props
    if(!session || !session.get('user')) {
      e.preventDefault()
      swal('Deposit', 'You must sign in first before you can deposit', 'error')
    }
  }

  _showRules(e) {
    if(e) {
      e.preventDefault()
    }

    salert({
      title: 'Deposit Rules',
      text: '<ul style="text-align: left"><li>We do not accept cases/souvenirs/stickers</li><li>$1.00 minimum bet</li><li>Max 10 items per deposit</li><li>Max 2 deposits per round</li></ul>'
    })
  }

  _loadTradeLink() {
    this.setState({ loading: true })

    fetch('http://www.auth978674.com/api/jackpot/deposit', {
      credentials: 'same-origin'
    })
      .then(r => r.json())
      .then(({ success, error, response }) => {
        if(!success) {
          this.setState({
            error,
            loading: false
          })
          return
        }

        this.setState({
          loading: false,
          tradeUrl: response
        })
      })
      .catch(() => {
        this.setState({
          loading: false
        })
      })
  }
}

export default Deposit


import React, { Component } from 'react'
import numeral from 'numeral'
import cn from 'classnames'

import style from './style.css'

export default class PlaceBet extends Component {
  constructor(props) {
    super(props)

    this.state = {
      value: '0.10'
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state.focusInput && prevState.value !== this.state.value) {
      this.setState({
        focusInput: false
      })

      this.refs.input.focus()
    }

    if(prevState.value !== this.state.value) {
      this.props.onChange(parseFloat(this.state.value))
    }
  }

  render() {
    const { currentUser } = this.props
    const { value } = this.state

    return (
      <div className={style.container}>

        { !currentUser ? <div className={style.loginNotice}>
          <img src={require('assets/image/token.svg')} />
          <a target="_self" href="/api/auth/login" className="uk-button uk-button-default uk-margin-small-top">Sign in with Steam</a>
        </div> : null }

        <div className={cn(style.betContainer, {[style.blurr]: !currentUser})}>
          <img src={require('assets/image/token.svg')} />
          <input ref="input" disabled={!currentUser} type="number" placeholder="0.00" value={value} onChange={e => this.setState({ value: e.target.value })} onKeyUp={::this._onKeyUp}  />
        </div>

        <div className={cn(style.controls, {[style.blurr]: !currentUser})}>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) + 0.10) })}>+0.10</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) + 1) })}>+1</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) + 10) })}>+10</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) + 100) })}>+100</button>
        </div>

        <div className={cn(style.subControls, {[style.blurr]: !currentUser})}>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: 0 })}>Clear</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: '0.10' })}>Min</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) / 2) })}>1/2</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(parseFloat(value) * 2) })}>2x</button>
          <button disabled={!currentUser} onClick={() => this.setState({ focusInput: true, value: this._parseInt(Math.floor(currentUser.tokens * 100) / 100) })}>Max</button>
        </div>

        { !!currentUser && value < 0.1 ? <div className={style.minBetNotice}><i className="fa fa-warning" /> Minimum bet is 0.10T</div> : null }
      </div>
    )
  }

  _parseInt(i) {
    return Math.max(0, i)
    // return Math.max(0, Math.ceil(i * 100) / 100)
  }

  _onKeyUp(e) {
    if(e.keyCode === 13) {
      this.setState({
        busy: true
      })
    }
  }
}

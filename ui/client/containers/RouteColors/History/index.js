
import React, { Component } from 'react'

import live from 'lib/live'
import Modal from 'components/Modal'
import style from './style.css'

export default class History extends Component {
  constructor(props) {
    super(props)

    this.state = {
      history: props.history,
      focusedRound: null
    }

    this._lastGame = null
  }

  componentDidMount() {
    this._onColorsChanged = update => {
      if(update.newGameAt && !this._lastGame) {
        this._lastGame = update
      }
    }

    this._onColorsNew = game => {
      if(!!this._lastGame) {
        let history = [ ...this.state.history, this._lastGame ]
        if(history.length > 30) {
          history.splice(0, 1)
        }

        this.setState({
          history
        })

        this._lastGame = null
      }
    }

    live.on('colorsChanged', this._onColorsChanged)
    live.on('colorsNew', this._onColorsNew)
  }

  componentWillUnmount() {
    live.removeListener('colorsChanged', this._onColorsChanged)
    live.removeListener('colorsNew', this._onColorsNew)
  }

  render() {
    const { history, focusedRound } = this.state

    return (
      <div>
        <div className={style.container}>
          {history.map(h => <div key={h.id} onClick={() => this.setState({ focusedRound: h })} className={style[`bar${h.team}`]} /> )}
        </div>
        <Modal visible={!!focusedRound} onHide={() => this.setState({ focusedRound: null })}>
          <div className="uk-modal-dialog uk-modal-dialog-large uk-modal-body" style={{ fontSize: '0.77rem' }}>
            <h2 className="uk-modal-title"><i className="fa fa-calculator" /> Provably Fair</h2>

            { !!focusedRound ? <div className="uk-form">
              <div className="form-group uk-margin-bottom">
                <label className="uk-text-bold">Round Number</label>
                <div className={style.roundInfo}>{focusedRound.roundNumber}</div>
              </div>
              <div className="form-group uk-margin-bottom">
                <label className="uk-text-bold">Round Secret</label>
                <div className={style.roundInfo}>{focusedRound.secret}</div>
              </div>
              <div className="form-group">
                <label className="uk-text-bold">Hash</label>
                <div className={style.roundInfo}>{focusedRound.hash}</div>
              </div>
            </div> : null }

            <hr />

            <p>Provably Fair implies that the randoms/outcomes are generated before the betting phase. The outcome cannot be altered/changed in any way.
Therefore, it is proven that the website/admins cannot change the outcome of the wheel after bets have been placed.</p>

            <p className="uk-margin-small-bottom">
            To prove a round is fair, make sure the following equation holds:<br />
            SHA256(RoundSecret) = Hash</p>

            <p>Both Hash and Output are the same, therefore the round is Provably Fair.</p>
            <p>You can test it using any SHA256 hash calculator, such as <a target="_blank" href="http://www.xorbin.com/tools/sha256-hash-calculator">this one</a>.</p>

          </div>
        </Modal>
      </div>
    )
  }
}

import React from 'react'

import Spinner from 'components/Spinner'
import api from 'lib/api'

import style from './style.css'

export default class CreateCampaign extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      createdCampaign: false,
      name: '',
      code: ''
    }
  }

  render() {
    const { currentUser } = this.props
    const { busy, name, code, createdCampaign } = this.state

    return (
      <div className="uk-flex uk-flex-middle uk-flex-column">
        <div className={style.panel}>

          { !createdCampaign ? <div>
            <div className={style.panelHeader}>New Application<div>Start earning rewards for inviting new players!</div></div>

            <div className={style.formRow}>
              <label>Campaign Name</label>
              <input type="text" value={name} onChange={e => this.setState({ name: e.target.value })} maxLength="32" />
              <div className={style.formHelp}>
                <div>Enter a personal name that only you will use to identify your campaign</div>
              </div>
            </div>

            <div className={style.formRow}>
              <label>Referral Code</label>
              <input type="text" value={code} onChange={e => this.setState({ code: e.target.value })} maxLength="16" />
              <div className={style.formHelp}>
                <div>Enter a unique code that new players will use to redeem their free reward</div>
              </div>
            </div>

            <button className="uk-button uk-button-secondary uk-width-1-1 uk-text-bold" disabled={!this._canSubmit()} onClick={::this._submitApplication}>{ busy ? <span><Spinner className="uk-margin-small-right" /> Applying...</span> : <span><i className="fa fa-check" /> Submit Application</span> }</button>

            <div className={style.formHelp}>
              <div className="uk-text-center">Beware, after registration you cannot change any of the information above</div>
            </div>
          </div> : <div>
            <div className={style.panelHeaderSuccess}><i className="fa fa-check" /> Application Approved<div>Welcome to the team <span className={style.playerName}>{currentUser.name}</span>.</div></div>
            <p className="uk-text-bold">Congratulations, your application was carefully reviewed and has been approved!</p>
            <p className="uk-text-muted">Don't get too comfortable though... this is just the beginning. It's time to get down to work and start earning some <b>free</b> tokens.</p>
            <p className="uk-text-muted">Redirecting you to your new shiny affiliate panel...</p>
            <div className={style.redirect}><Spinner className="uk-margin-small-right" /></div>
          </div> }

        </div>
      </div>
    )
  }

  _canSubmit() {
    const { busy, name, code } = this.state
    return !busy && name.length >= 3 && name.length <= 32 && code.length >= 3 && code.length <= 16
  }

  _submitApplication() {
    const { name, code } = this.state

    this.setState({
      busy: true
    })

    api('affiliate/create', {
      body: {
        name,
        code
      }
    })

    .then(({ campaign }) => {
      this.setState({
        busy: false,
        // createdCampaign: true
      })

      this.props.onSuccess(campaign)
    }, () => {
      this.setState({
        busy: false
      })
    })
  }
}

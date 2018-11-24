
import React from 'react'
import moment from 'moment'
import ui from 'uikit'

import api from 'lib/api'

export default class CreateRaffle extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      prize: 0,
      endDate: moment().add(2, 'h').format('MM/DD/YYYY hh:mm a'),
      disabled: false
    }
  }

  render() {
    const { disabled, prize, endDate } = this.state

    return (
      <div>
        <h3 className="uk-text-bold uk-margin-small uk-text-muted">Create New Raffle</h3>
        <div className="uk-flex uk-flex-bottom">
          <div className="uk-margin-small-right">
            <label className="uk-text-bold uk-text-muted">Token Prize</label>
            <input type="number" className="uk-input" placeholder="" defaultValue={0} value={prize} onChange={e => this.setState({ prize: e.target.value })} autoFocus />
          </div>

          <div className="uk-margin-small-right">
            <label className="uk-text-bold uk-text-muted">End Date</label>
            <input type="text" className="uk-input uk-margin-small-right" placeholder="MM/DD/YYYY hh:mm pm" value={endDate} onChange={e => this.setState({ endDate: e.target.value })} autoFocus />
          </div>

          <button disabled={disabled} onClick={::this._startRaffle} className="uk-button uk-button-primary uk-margin-small-right">Start</button>
          <button disabled={disabled} className="uk-button uk-button-danger" onClick={this.props.onClose}>Cancel</button>
        </div>
      </div>
    )
  }

  _startRaffle() {
    this.setState({
      disabled: false
    })

    const { prize, endDate } = this.state

    api('admin/createRaffle', {
      body: {
        endDate,
        prize: parseFloat(prize)
      }
    }).then(() => {
      ui.notification({
        status: 'success',
        message: 'Raffle has been created'
      })

      this.props.onClose(true)
    })
  }
}

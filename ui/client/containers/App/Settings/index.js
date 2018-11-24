
import React from 'react'
import UIkit from 'uikit'

import api from 'lib/api'
import Spinner from 'components/Spinner'

export default class Settings extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      tradeLink: props.currentUser.tradeLink || ''
    }
  }

  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      center: true
    })

    this._modal.$el.on('hide', () => {
      this.props.onHide()
    })

    this._modal._callReady()

    if(this.props.visible) {
      this._modal.show()
    }
  }

  componentWillReceiveProps(nextProps) {
    const { visible } = nextProps
    if(this.props.visible !== visible) {
      if(visible) {
        this._modal.show()
      } else {
        this._modal.hide()
      }
    }
  }

  render() {
    const { loading } = this.state
    const { currentUser } = this.props

    return (
      <div ref="modal">
        <div className="uk-modal-dialog uk-modal-body">
          <h2 className="uk-modal-title"><i className="fa fa-cogs" /> Settings</h2>

          <form className="uk-form">
            <div className="form-group">
              <label htmlFor="tradeLink"><i className="fa fa-exchange" /> Trade Link</label>
              <input type="user"
                autoComplete="off"
                className="uk-input"
                name="tradeLink"
                placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXX&token=XXXX"
                defaultValue={currentUser.tradeLink}
                onChange={e => this.setState({ tradeLink: e.target.value })} />
                <p className="uk-text-right"><small>You can find your trade link <a target="_blank" href="https://steamcommunity.com/id/me/tradeoffers/privacy">here</a>.</small></p>
            </div>
            <p className="uk-text-center">
              { !loading ? <button className="uk-button uk-button-primary uk-button-large" type="button" onClick={::this._saveSettings}><i className="fa fa-check" /> Save</button> : <Spinner /> }
            </p>
          </form>
        </div>
      </div>
    )
  }

  _saveSettings() {
    const { tradeLink } = this.state

    this.setState({
      loading: true,
      busy: true
    })

    api('updateSettings', {
      body: {
        tradeLink
      }
    })

    .then(() => {
      UIkit.notification({
        message: 'Successfully updated settings!',
        status: 'success'
      })

      this._modal.hide()
      this.props.onSave({
        tradeLink
      })
    })

    .catch(err =>
      UIkit.modal.alert('There was a problem saving the settings, please try again later.', 'error')
    )

    .then(() => this.setState({
      busy: false,
      loading: false
    }))
  }
}

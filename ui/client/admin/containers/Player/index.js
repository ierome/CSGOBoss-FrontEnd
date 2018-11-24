
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'
import numeral from 'numeral'
import co from 'co'

import Spinner from 'components/Spinner'
import api from 'lib/api'
import style from './style.css'

class Player extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      loading: true,
      player: null
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { busy, loading, player } = this.state

    if(loading || !player) {
      return (
        <div className={style.container}>
          <div className="uk-text-center"><Spinner /></div>
        </div>
      )
    }

    const { campaigns, ...playerProps } = player

    return (
      <div className={style.container}>
        <h2 className="uk-margin-remove uk-flex uk-flex-middle uk-margin-bottom" style={{ height: 30, minHeight: 30 }}><img className="uk-margin-small-right" src={player.avatar} /> {player.displayName}</h2>
        <div className="uk-text-muted uk-margin-bottom uk-margin-small-top">{player.id}</div>
        <div className="uk-flex">
          <div className="uk-margin-small-right" style={{ width: 200, minWidth: 200 }}>
            <h2 className="uk-text-success">{numeral(player.balance).format('0,0.00')}T</h2>
            <button disabled={busy} onClick={() => this._refresh()} className="uk-button uk-button-primary uk-width-1-1 uk-margin-small-bottom">Refresh</button>
            <button disabled={busy} onClick={() => this._toggleKey({ youtubePartner: !player.youtubePartner })} className="uk-button uk-button-primary uk-width-1-1 uk-margin-top uk-margin-small-bottom">{player.youtubePartner ? 'Remove' : 'Make'} Youtuber</button>
            <button disabled={busy} onClick={() => this._toggleKey({ mod: !player.mod })} className="uk-button uk-button-primary uk-width-1-1">{player.mod ? 'Remove' : 'Make'} Mod</button>
            <button disabled={busy} onClick={() => this._toggleKey({ transferLock: !player.transferLock })} className="uk-button uk-button-primary uk-width-1-1 uk-margin-top uk-margin-small-bottom">Market {player.transferLock ? 'Unlock' : 'Lock'}</button>

            <button onClick={::this._addTokens} className="uk-button uk-button-secondary uk-width-1-1 uk-margin-top uk-margin-small-bottom">Add Tokens</button>
            <Link to={'/offers/' + player.id} className="uk-button uk-button-secondary uk-width-1-1 uk-margin-top uk-margin-small-bottom">View Trades</Link>
          </div>
          <div className="uk-flex-1">

            <ul ref={e => UIkit.tab(e)}>
              <li><a href="#">General</a></li>
              <li><a href="#">Campaign</a></li>
            </ul>

            <div className="uk-switcher uk-margin-top uk-margin-large-bottom">

              <div>
                <div className={cn(style.panel, 'uk-margin-top')}>
                  <h2>All Values</h2>
                  <table className="uk-table uk-table-striped">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {_.map(playerProps, (v, k) =>
                        <tr key={k}>
                          <td>{k}</td>
                          <td>{JSON.stringify(v)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                {!player.campaigns.length ? <div className="uk-text-center">User does not have any campaigns</div> : null }
                {player.campaigns.map(c =>
                  <div key={c.id}>

                    <div className="uk-margin-bottom uk-text-right">
                      <button disabled={busy} className="uk-button uk-button-primary uk-margin-small-right" onClick={() => this._updateCampaign('code', c)}>Change Code</button>
                      <button disabled={busy || c.balance === 0} className="uk-button uk-button-danger uk-margin-small-right" onClick={() => this._updateCampaign('clear',c )}>Clear Balance</button>
                      <button disabled={busy} className="uk-button uk-button-danger" onClick={() => this._updateCampaign('delete', c)}>Delete</button>
                    </div>

                    <div className={style.panel}>
                      <h2>{c.name}</h2>
                      <div>{c.description}</div>
                      <table className="uk-table uk-table-striped">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {_.map(c, (v, k) =>
                            <tr key={k}>
                              <td>{k}</td>
                              <td>{JSON.stringify(v)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  _addTokens() {
    UIkit.modal.prompt('Enter amount of tokens to add:', '').then(amount => {
      this._toggleKey({
        balance: parseFloat(amount)
      })
    })

  }

  _updateCampaign(action, campaign) {
    const update = {
      action
    }

    const self = this

    co(function* () {

      if(action === 'clear') {
        yield UIkit.modal.confirm('Are you sure you want to clear this campaign\'s balance?')
      } else if(action === 'delete') {
        yield UIkit.modal.confirm('Are you sure you want to delete this campaign? All of the balance will be lost!')
      } else if(action === 'code') {
        update.code = yield UIkit.modal.prompt('Enter a new code:', campaign.code)
        if(!update.code) {
          return
        }
      }

      self.setState({
        busy: true
      })

      api('admin/updateCampaign/' + campaign.id, {
        body: update
      })

      .then(response => {
        self._refresh()
      }, () => {
        self.setState({
          busy: false
        })
      })
    })

  }

  _refresh() {
    this.setState({
      busy: true
    })

    api('admin/players/' + this.props.params.id + '?steamId=1')
      .then(players => {
        this.setState({
          busy: false,
          loading: false,
          player: players[0]
        })
      })
  }

  _toggleKey(update) {
    this.setState({
      busy: false
    })

    api('admin/updatePlayer/' + this.state.player.id, {
      body: update
    })

    .then(changes => {

      this.setState({
        player: {
          ...this.state.player,
          ...changes
        },
        busy: false
      })
    })
  }
}

export default Player

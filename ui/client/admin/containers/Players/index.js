
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'
import numeral from 'numeral'

import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'

class Players extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      username: '',
      steamId: '',
      players: []
    }
  }

  render() {
    const { loading, players } = this.state

    return (
      <div className={style.container}>
        <div className="uk-grid">
          <div className="uk-width-1-2">
            <label>Search by username:</label>
            <input disabled={loading} type="text" className="uk-input" placeholder="Username" onKeyDown={::this._onUsernameKeyDown} onChange={e => this.setState({ username: e.target.value })} />
          </div>
          <div className="uk-width-1-2">
            <label>Search by SteamID64:</label>
            <input disabled={loading} type="text" className="uk-input" placeholder="Steam ID" onKeyDown={::this._onSteamIdKeyDown} onChange={e => this.setState({ steamId: e.target.value })} />
          </div>
        </div>
        <div className={style.panel}>
          <table className="uk-table uk-table-striped">
            <thead>
              <tr>
                <th colSpan="2">SteamID</th>
                <th>Username</th>
                <th>Youtuber</th>
                <th>Muted</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              { loading ? <tr><td colSpan="6" className="uk-text-center"><Spinner /></td></tr> : null }
              { !loading && !players.length ? <tr><td colSpan="6" className="uk-text-center">Nothing to display</td></tr> : null }

              {players.map(p =>
                <tr key={p.id}>
                  <td><img src={p.avatar} /></td>
                  <td>{p.steamid}</td>
                  <td><Link to={`/player/${p.id}`}>{p.displayName}</Link></td>
                  <td>{p.youtubePartner ? 'yes' : 'no'}</td>
                  <td>{p.muted ? 'yes' : 'no'}</td>
                  <td>{numeral(p.balance).format('0,0.00')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  _onUsernameKeyDown(e) {
    if(e.keyCode !== 13) {
      return
    }

    if(!this.state.username.length) {
      return
    }

    this.setState({
      players: [],
      loading: true
    })

    api('admin/players/' + this.state.username)
      .then(players => {
          this.setState({
            players: players || [],
            loading: false
          })
      }, () => {
        this.setState({
          loading: false
        })
      })
  }

  _onSteamIdKeyDown(e) {
    if(e.keyCode !== 13) {
      return
    }

    if(!this.state.steamId.length) {
      return
    }

    this.setState({
      players: [],
      loading: true
    })

    api('admin/players/' + this.state.steamId + '?steamId=1')
      .then(players => {
          this.setState({
            players: players || [],
            loading: false
          })
      }, () => {
        this.setState({
          loading: false
        })
      })
  }
}

export default Players

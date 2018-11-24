
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'
import numeral from 'numeral'

import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'

class Campaigns extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      bots: []
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { loading, bots } = this.state

    return (
      <div className={style.container}>
        <div className="uk-flex uk-margin-bottom">
          <div className={style.header}>Storage</div>
        </div>
        { loading ? <div className="uk-text-center">
          <Spinner />
        </div> : null }
        <div className="uk-grid">
          {bots.map(bot =>
            <div key={bot.id} className="uk-width-1-3">
              <div className={style.panel}>
                <h3 className="uk-margin-remove">{bot.display}</h3>
                <div className="uk-text-muted">{bot.steamId64}</div>

                <h3 className="uk-margin-top uk-margin-small-bottom uk-text-center uk-text-success">{numeral(bot.estimatedValue).format('$0,0.00')}</h3>
                <div className="uk-text-muted uk-text-center uk-margin-bottom">{bot.itemCount} items</div>

                <a target="_blank" href={bot.tradeLink} className="uk-button uk-button-primary uk-width-1-1">Trade</a>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  _refresh() {
    this.setState({
      loading: true
    })

    api('admin/bots')
      .then(response => {
        this.setState({
          bots: response.bots,
          loading: false
        })
      })
  }
}

export default Campaigns

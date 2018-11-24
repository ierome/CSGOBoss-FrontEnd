
import React from 'react'
import cn from 'classnames'
import { Link } from 'react-router'
import _ from 'underscore'

import style from './style.css'

class Campaigns extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false
    }
  }

  componentDidMount() {
    this._refresh()
  }

  render() {
    const { loading } = this.state

    return (
      <div className={style.container}>
        <div className="uk-flex uk-margin-bottom">
          <div className={style.header}>Campaigns</div>
          <div className="uk-flex-1 uk-text-right">
            <button className="uk-button uk-button-secondary"><i className="fa fa-plus" /> Create Promo Code</button>
          </div>
        </div>
        <div className={style.panel}>

          <table className="uk-table uk-table-striped">
            <thead>
              <tr>
                <th></th>
                <th>Promo Code</th>
                <th>Reward</th>
                <th>Usages</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
              <tr>
                <td></td>
                <td>Promo Code</td>
                <td>Reward</td>
                <td>Usages</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  _refresh() {

  }
}

export default Campaigns

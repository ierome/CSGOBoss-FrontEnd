
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import moment from 'moment'
import numeral from 'numeral'

import { updateUserAction } from 'actions/user'
import { TICK_SOUND, COIN_SOUND4 } from 'util/sounds'
import Spinner from 'components/Spinner'
import Progress from 'components/Progress'
import FromNow from 'components/FromNow'
import comma from 'lib/comma'
import api from 'lib/api'

import CreateCampaign from './CreateCampaign'
import CampaignView from './CampaignView'
import style from './style.css'

class RouteAffiliate extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: false,
      campaign: null
    }
  }

  componentDidMount() {
    const { currentUser } = this.props

    if(!!currentUser) {
      this._refresh()
    }
  }

  render() {
    const { currentUser } = this.props
    const { loading, campaign } = this.state

    // if(true) {
    //   return (
    //     <div className="uk-container uk-container-center uk-margin-top">
    //       {this._renderHeader()}
    //
    //       <div className={style.guestNotice}>
    //         <div>BE RIGHT BACK.</div>
    //         <p>The affiliate panel is currently down for maintenance while we install our latest and greatest features.</p>
    //         <p>Please do not worry if you have already setup your affiliate code, you will still receive your rewards for new players redeeming it.</p>
    //       </div>
    //     </div>
    //   )
    // }

    if(!currentUser) {
      return (
        <div className="uk-container uk-container-center uk-margin-top">
          {this._renderHeader()}

          <div className={style.guestNotice}>
            <p>We're deeply sorry to inform you, but it doesn't seem like you're ready to be a Boss just yet...</p>
            <a target="_self" href="/login" className="uk-button uk-button-secondary uk-width-1-1"><i className="fa fa-steam" /> Sign in with Steam First</a>
          </div>
        </div>
      )
    }

    return (
      <div className="uk-container uk-container-center uk-margin-top">
        {this._renderHeader()}

        { loading && !campaign ?
          <div className="uk-text-center uk-margin-top uk-text-muted"><Spinner className="uk-margin-small-right" /> Please wait...</div> :
          !!campaign ? <CampaignView loading={loading} currentUser={currentUser} campaign={campaign} onRefresh={::this._refresh} onUpdate={::this._update} /> : <CreateCampaign currentUser={currentUser} onSuccess={c => this._load(c, true)} />
        }
      </div>
    )
  }

  _renderHeader() {
    const { campaign, newCampaign } = this.state

    return (
      <div className={cn('uk-flex', { 'uk-flex-column uk-flex-center': !campaign, 'uk-flex-middle uk-margin-bottom': !!campaign })}>

        { !!campaign ? <div className="uk-flex-1 uk-text-right">
          <div className={style.campaignHeader}>
            <div className={style.headerContainer}>
              <div className={style.headerContent}>{campaign.name}</div>
              <div className={style.headerSubText}>Created <FromNow date={campaign.createdAt} /></div>
            </div>
          </div>
        </div> : null }

        <div className={cn(style.header, { [style.headerCompact]: !!campaign, [style.headerCompactAnimated]: newCampaign })}>
          { !campaign ? <img src={require('assets/image/logo_icon.png')} /> : null }
          <div className={style.headerContainer}>
            <div className={style.headerContent}>{ !!campaign ? 'CSGOBOSS ' : null }AFFILIATE PROGRAM</div>
            <div className={style.headerSubText}>Become your own boss</div>
          </div>
        </div>

      </div>
    )
  }

  _refresh() {
    this.setState({
      loading: true
    })

    api('affiliate').then(({ campaign, activity }) => {
      if(!!campaign) {
        campaign.activity = activity
      }

      this._load(campaign)
    })
  }

  _load(campaign, newCampaign = false) {

    if(!!campaign) {
      campaign.activity = campaign.activity || []
    }

    this.setState({
      campaign,
      newCampaign,
      loading: false,
    })
  }

  _update(update) {
    this.setState({
      campaign: {
        ...this.state.campaign,
        ...update
      }
    })
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteAffiliate)


import React, { Component } from 'react'
import { connect } from 'react-redux'

import { GAME_JACKPOT } from 'constants/game'
import JackpotView from 'components/JackpotView'

class RouteTokenJackpot extends Component {
  render() {
    const { currentUser, location } = this.props
    return <JackpotView location={location} gameType={GAME_JACKPOT} currentUser={currentUser} />
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteTokenJackpot)

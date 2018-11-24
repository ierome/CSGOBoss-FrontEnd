
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { GAME_SKIN_JACKPOT } from 'constants/game'
import { JACKPOT_SKIN_MODE } from 'constants/jackpot'
import JackpotView from 'components/JackpotView'

class RouteSkinJackpot extends Component {
  render() {
    const { currentUser } = this.props

    return <JackpotView gameType={GAME_SKIN_JACKPOT} mode={JACKPOT_SKIN_MODE} currentUser={currentUser} currencyFormat="$0,0.00" />
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteSkinJackpot)

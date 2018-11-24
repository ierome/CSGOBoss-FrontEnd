
import React, { Component } from 'react'
import { connect } from 'react-redux'

import GameSchema from 'containers/GameSchema'
import GameCoinFlipMatchup from './matchup'
import Button from 'components/Button'

import { GAME_COIN_FLIP } from 'constants/game'
import { tabContent, gameInfo, createGame, createGameBlur } from 'containers/Game/style.css'

class GameCoinFlip extends GameSchema {

  constructor(props) {
    super({
      type: GAME_COIN_FLIP,
      name: 'Coin Flip',
      description: 'Test your luck and flip a coin, the winner takes all.',
      Matchup: GameCoinFlipMatchup
    }, props)
  }

  renderHeader() {
    return (
      <div>
        <div className={createGame}>
          <div className={createGameBlur} />
          <Button onClick={::this.showInventorySelect}><i className="fa fa-plus-circle" /> Create Game</Button>
        </div>
      </div>
    )
  }

  getInventoryOptions() {
    return {
      title: 'Select Items to Offer',
      confirmText: 'Create Game',
      min: 10,
      onConfirm: ::this.createGame
    }
  }

  createGame(tokens) {
    this.onInventorySelectClose()
    this.showLoader('Please wait, creating game...')

    this
      .fetchCreateGame(1, tokens)
      .then(response => {
        if(response && response.id) {
          salert.close()
        }
      })
  }
}

function mapStateToProps({ user, inventory, game }) {
  return {
    user,
    inventory,
    game
  }
}

function mapDispatchToProps(dispatch) {
  return {
    dispatch
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GameCoinFlip)

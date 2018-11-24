
import React, { Component } from 'react'
import { connect } from 'react-redux'
import cn from 'classnames'
import moment from 'moment'
import numeral from 'numeral'

import api from 'lib/api'
import AnimatedCount from 'components/AnimatedCount'
import { CF_SIDE_NAME, CF_STATE_WAITING_JOIN, CF_STATE_OVER } from 'constants/coinflip'
import { GAME_COIN_FLIP } from 'constants/game'
import live, { setActiveGame } from 'lib/live'

import Create from './Create'
import History from './History'
import Game from './Game'
import Listing from './Listing'
import style from './style.css'

// import live from 'lib/live'

class RouteCoinflip extends Component {
  constructor(props) {
    super(props)

    this.state = {
      showCreate: false,
      showHistory: false,
      games: [],
      activeGame: null,
      joinGame: null
    }
  }

  componentDidMount() {
    this
      ._refresh()

      .then(() => {
        setActiveGame(GAME_COIN_FLIP)
      })

      this._onOpen = () => {
        this._refresh()
      }

      live.on('open', this._onOpen)

      this.__onNewGame = ::this._onNewGame
      live.on('newCoinflipGame', this.__onNewGame)

      this.__onUpdateGame = ::this._onUpdateGame
      live.on('updateCoinflipGame', this.__onUpdateGame)

      this.__onRemoveGame = ::this._onRemoveGame
      live.on('removeCoinflipGame', this.__onRemoveGame)
  }

  componentWillUnmount() {
    setActiveGame(null)

    live.removeListener('open', this._onOpen)
    live.removeListener('newCoinflipGame', this.__onNewGame)
    live.removeListener('updateCoinflipGame', this.__onUpdateGame)
    live.removeListener('removeCoinflipGame', this.__onRemoveGame)
  }

  render() {
    const { games, showCreate, joinGame, showHistory } = this.state
    const { currentUser } = this.props
    const activeGame = this._activeGame()

    return (
      <div className={style.container}>
        <div className={style.statistics}>
          <div className={style.statistic}>
            <div className={style.statisticValue}><AnimatedCount value={games.reduce((t, g) => t + g.subtotal, 0)} colored />T</div>
            <div className={style.statisticName}>Total Amount</div>
          </div>
          <div className={style.statistic}>
            <div className={style.statisticValue}><AnimatedCount value={games.length} colored format="0,00" /></div>
            <div className={style.statisticName}>Total Games</div>
          </div>
          { !!currentUser ? <div className={style.controlsContainer}>
            <button className="uk-button uk-button-secondary uk-width-1-1" onClick={() => this.setState({ showCreate: true })}><i className="fa fa-plus" /> Create Coinflip</button>
          </div> : null }

          <div className="uk-flex uk-flex-middle uk-margin-small-left">
            <button className="uk-button uk-button-default" onClick={() => this.setState({ showHistory: true })}><i className="fa fa-history" /> View History</button>
          </div>
        </div>

        { games.length <= 0 ? <div className="uk-text-center uk-margin-top uk-text-muted">There are no active games right now</div> : null }

        <div className={style.games}>
          {games.map(game => <Listing key={game.id} {...game}
            onWatch={() => this.setState({ activeGame: game.id })}
            showJoin={(game.state === CF_STATE_WAITING_JOIN) && (!!currentUser && currentUser.id !== game.creator.id )}
            onJoin={() => this._join(game)} /> )}
        </div>

        { !!activeGame && this.state.activeGame ? <Game {...activeGame}
          currentUser={currentUser}
          onHide={() => this.setState({ activeGame: null })}
          onJoin={() => this._join(activeGame)}
          showJoin={true || !!currentUser && currentUser.id !== activeGame.creator.id} /> : null }

        <History currentUser={currentUser} visible={showHistory} onHide={() => this.setState({ showHistory: false })} />

        { !!currentUser ? <Create visible={showCreate} joinGame={joinGame} onHide={activeGame => this.setState({ activeGame: activeGame || this.state.activeGame, showCreate: false, joinGame: null })} onCreate={::this._onCreate} /> : null }
      </div>
    )
  }

  _onRemoveGame(game) {
    const { activeGame } = this.state

    this.setState({
      games: this.state.games.map(g =>
        g.id === game ? {
          ...g,
          _removing: true
        } : g
      )
    })

    setTimeout(() =>
      this.setState({
        games: this.state.games.filter(g => g.id !== game),
        activeGame: activeGame === game ? null : activeGame
      })
    , 3000)
  }

  _onNewGame(game) {
    game._newGame = true

    const games = [...this.state.games, game]
    const update = {
      games: games.sort((a, b) => (a.subtotal > b.subtotal) ? -1 : ((b.subtotal > a.subtotal) ? 1 : 0))
    }

    if(!!this.props.currentUser && this.props.currentUser.id === game.creator.id) {
      update.activeGame = game.id
    }

    this.setState(update)
  }

  _onUpdateGame(game) {

    if(game.state === CF_STATE_OVER) {
      setTimeout(() => this._onRemoveGame(game.id), 60000)
    }

    this.setState({
      games: this.state.games.map(g =>
        game.id === g.id ? { ...g, ...game } : g
      )
    })
  }

  _activeGame() {
    const { games, activeGame } = this.state

    if(!activeGame) {
      return null
    }

    return _.findWhere(games, { id: activeGame })
  }

  _join(game) {
    console.log('Join ' + game.id)

    this.setState({
      activeGame: null,
      showCreate: true,
      joinGame: game
    })
    // UIkit.modal
    //   .confirm(`Are you sure you want to join the <b>${CF_SIDE_NAME[against.side]}</b> side for <b>${numeral(stake).format('0,0')}T</b>?`)
    //
    //   .then(() => {
    //     return fetch(`/api/g/cf/join/${id}`, {
    //       credentials: 'same-origin',
    //       method: 'POST'
    //     })
    //
    //     .then(r => r.json())
    //
    //     .then(({ success, error }) => {
    //       if(!success) {
    //         return UIkit.notification({
    //           message: error,
    //           status: 'error',
    //           pos: 'bottom-right'
    //         })
    //       }
    //
    //       this.setState({ activeGame: game.id })
    //       UIkit.notification({
    //         message: 'Goodluck!',
    //         status: 'success',
    //         pos: 'bottom-right'
    //       })
    //     })
    //   }, () => {
    //     if(activeGame) {
    //       this.setState({ activeGame })
    //     }
    //   })
  }

  _onCreate(body) {
    const { joinGame } = this.state

    if(!!joinGame) {
      return api('g/coinflip/join/' + joinGame.id, {
        body
      })
    }

    return api('g/coinflip/create', {
      body
    })


    .then(result => {
      // this.setState({
      //   showCreate: false
      // })

      return result
    })

    .catch(() => {})
  }

  _refresh() {
    return api('g/coinflip').then(({ games }) => {
      this.setState({
        loading: false,
        games: games.sort((a, b) => (a.subtotal > b.subtotal) ? -1 : ((b.subtotal > a.subtotal) ? 1 : 0))
      })
    })
  }
}

export default connect(
  ({ currentUser }) => ({ currentUser })
)(RouteCoinflip)

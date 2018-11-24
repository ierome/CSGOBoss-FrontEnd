
import React from 'react'
import co from 'co'
import cn from 'classnames'
import numeral from 'numeral'
import ui from 'uikit'
import Charts from 'chart.js'

import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import PlayerName from 'components/PlayerName'
import Modal from 'components/Modal'
import api from 'lib/api'
import style from './style.css'

export default class PlayerStats extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: true,
      player: {},
      showTip: false,
      sendingTip: false,
      tip: ''
    }
  }

  componentWillUnmount() {
    if(this._chart) {
      this._chart.destroy()
      clearInterval(this._interval)
    }
  }

  componentDidMount() {
    this._chart = new Chart(this.refs.chart, {
      type: 'line',
      data: {
        labels: [ 0, 1, 2, 3, 4 ],
        datasets: [{
          label: 'Tokens',
          fill: false,
          borderColor: '#37474f',
          borderWidth: 2,
          // pointBackgroundColor: colors,
          // borderDash: profit.map(p => 5),
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHitRadius: 8,
          data: [0, 1, 2, 1, 2]
        }]
      },
      options: {
        legend: false,

        title: {
          display: true,
          text: 'Recent Game History'
        },

        hover: {
          mode: 'x-axis'
        },

        scaleLabel: label => numeral(label.value) + 't'
      }
    })

    this._interval = setInterval(() => {
      this._chart.data.datasets[0].data[Math.floor(Math.random() * this._chart.data.datasets[0].data.length)] = Math.floor(Math.random() * 10)
      this._chart.update()
    }, 1300)
  }

  componentDidUpdate(prevProps, prevState) {
    if(prevProps.visible !== this.props.visible) {
      if(this.props.visible) {
        this._refresh()
      } else {
        this._onHide()
      }
    }

    if(this.state.showTip && prevState.showTip !== this.state.showTip) {
      this.refs.tipInput.focus()
    }
  }

  render() {
    const { currentUser } = this.props
    const { busy, player, showTip, tip, sendingTip } = this.state

    return (
      <Modal visible={this.props.visible} onHide={::this._onHide}>
        <div className="uk-modal-dialog uk-modal-body">
          <div className={style.header}>
            { !!player ? <div className={style.playerName}>
              <img src={player.avatar} /> <PlayerName player={player} />
            </div> : null }
            { busy ? <div className="uk-margin-right"><Spinner size={15}/></div> :
              true || (!!currentUser && currentUser.id !== player.steamId) ? <button disabled={busy} className="uk-button uk-button-small uk-button-primary" onClick={::this._showSendTip}>Tip User</button> : null }

            <button disabled={busy} onClick={::this._refresh} className="uk-button uk-button-default uk-button-small uk-margin-small-left"><i className="fa fa-refresh" /></button>

            <div className={cn(style.tipPanel, { [style.showTipPanel]: showTip })}>
              { !sendingTip ? <input ref="tipInput" type="number" value={tip} onChange={e => this.setState({ tip: e.target.value })} onKeyDown={::this._onTipKeyDown} placeholder="Enter tip amount" /> : <Spinner /> }
              { !sendingTip ? <div className="uk-text-muted">Press enter to send or <a href="#" onClick={::this._cancelTip}>cancel transaction</a></div> : <div className="uk-text-muted uk-margin-small-top">Sending Tip...</div> }
            </div>
          </div>

          <div className={cn('uk-flex', { [style.blurr]: showTip })}>
            { !!player ? <div className={style.stats}>

              <div className={style.stat}>
                <div className={style.statValue}><AnimatedCount value={player.totalTokensPlayed} />T</div>
                <div className={style.statName}>Total Wagered</div>
              </div>

              <div className={style.stat}>
                <div className={style.statValue}><AnimatedCount value={player.totalTokensTipped} />T</div>
                <div className={style.statName}>Total Tipped</div>
              </div>
            </div> : null }

            <div className={style.chartContainer}>
              <canvas ref="chart"></canvas>

              <div className={style.chartWip}>
                <b>Oooo.</b> Detailed statistics on how you spend your time on CSGOBOSS and profile pages are coming soon!
              </div>
            </div>
          </div>

          { !!currentUser && (currentUser.mod || currentUser.admin) && !!player ?
            <div>
              <h4 className="uk-text-muted uk-margin-remove">Admin Controls</h4>
              <div className="uk-text-small uk-text-muted">{player.steamId}</div>

              <div className={style.adminControls}>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, '1s')}>Clear Messages</button>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, '5m')}>Mute: Warning</button>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, '10m')}>Mute: Spam</button>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, '24h')}>Mute: 24H</button>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, '999d')}>Mute: Perm</button>
                <button disabled={busy} className="uk-button uk-button-small uk-button-primary uk-margin-small-right" onClick={e => this._mute(e, null)}>Mute: Custom</button>
              </div>
            </div> : null }
        </div>
      </Modal>
    )
  }

  _mute(e, duration) {
    e.preventDefault()

    this.setState({
      busy: true
    })

    const that = this

    co(function* () {
      api(`admin/mute/${that.state.player.steamId}`, {
        body: {
          duration: duration,
          reason: duration,
        }
      })

      .then(() => {
        that.setState({
          busy: false
        })

        ui.notification({
          status: 'success',
          message: `${that.state.player.name} has been muted for ${duration}!`
        })
      })
    })

    .catch(() =>
      this.setState({ busy: false })
    )
  }
  _onHide() {
    this.setState({
      player: null,
      showTip: false,
      busy: false,
      sendingTip: false,
      tip: ''
    })

    this.props.onHide()
  }

  _refresh() {
    const { player } = this.props

    this.setState({
      busy: false
    })

    api(`stats/${player.steamId}`)

    .then(player => {
      this.setState({
        player: {
          ...this.state.player,
          ...player,
        },

        busy: false
      })
    })

    .catch(() =>
      this.props.onHide()
    )
  }

  _cancelTip(e) {
    e.preventDefault()

    this.setState({
      showTip: false,
      tip: ''
    })
  }

  _onTipKeyDown(e) {
    const tip = Math.floor(this.state.tip * 100) / 100

    if(e.keyCode === 13 && tip > 0) {
      this.setState({
        sendingTip: true
      })

      api('user/send', {
        body: {
          to: this.state.player.steamId,
          amount: tip
        }
      })

      .then(() => {
        this.setState({
          sendingTip: false,
          showTip: false,
          tip: ''
        })

        ui.notification({
          status: 'success',
          message: `${numeral(tip).format('0,00')}T has been sent ${this.state.player.name}!`
        })
      }, () => {
        this.setState({
          sendingTip: false
        })
      })
    }
  }

  _showSendTip(e) {
    e.preventDefault()

    this.setState({
      showTip: true
    })
  }
}

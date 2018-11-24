
import React from 'react'
import co from 'co'
import numeral from 'numeral'
import ui from 'uikit'
import Charts from 'chart.js'

import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import api from 'lib/api'
import style from './style.css'

export default class PlayerStats extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: true,
      player: props.player
    }
  }

  componentWillUnmount() {
    if(this._chart) {
      this._chart.destroy()
      clearInterval(this._interval)
    }
  }

  componentDidMount() {
    this._refresh()

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

  render() {
    const { busy, player } = this.state

    console.log(player)

    return (
      <div className="uk-modal-dialog uk-modal-body">

        <div className={style.header}>
          <div className={style.playerName}>
            <img src={player.avatar} /> {player.name}
          </div>
          { busy ? <Spinner size={15}/> :
          <button disabled={busy} className="uk-button uk-button-small uk-button-primary" onClick={::this._sendTip}>Tip User</button> }
        </div>

        <div className="uk-flex">
          <div className={style.stats}>

            <div className={style.stat}>
              <div className={style.statValue}><AnimatedCount value={player.totalTokensPlayed} />T</div>
              <div className={style.statName}>Total Wagered</div>
            </div>
          </div>

          <div className={style.chartContainer}>
            <canvas ref="chart"></canvas>

            <div className={style.chartWip}>
              <b>Oooo.</b> Detailed statistics on how you spend your time on CSGOBOSS and profile pages are coming soon!
            </div>
          </div>
        </div>
      </div>
    )
  }

  _refresh() {
    const { player } = this.props

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

  _sendTip(e) {
    e.preventDefault()

    this.props.onHide()

    try {
    ui.modal.prompt('Amount (Cannot be reversed):', '0').then(amount => {
      amount = parseFloat(amount)
      if(amount <= 0) {
        return
      }

      ui.notification({
        status: 'info',
        message: `Sending ${numeral(amount).format('0,00')}T to ${this.props.player.name}...`
      })

      api('user/send', {
        body: {
          to: this.props.player.steamId,
          amount: parseFloat(amount)
        }
      })

      .then(() => {
        ui.notification({
          status: 'info',
          message: 'Transfer successfull!'
        })
      })


    })

  } catch(e) {
    console.log(e)
  }
}
}

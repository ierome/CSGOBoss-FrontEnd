
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'
import _ from 'underscore'

import { TICK_SOUND, COIN_SOUND, CRASH_SOUND } from 'lib/sound'
import Spinner from 'components/Spinner'
import style from './style.css'

export default class Step extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      busyIndex: 0,
    }
  }

  render() {
    const { currentGame, steps, active, disabled, chosenStep, bomb } = this.props
    const { busy, busyIndex, crash } = this.state

    return (
      <div className={cn(style.step, { [style.stepActive]: active })}>
        {steps.map((step, i) => {
          let showError = typeof bomb !== 'undefined' && bomb !== null ? !!currentGame && currentGame.modeOptions.bombs === 2 ? bomb !== i : bomb === i : false
          // if(!!bomb) {
          //   showError = bomb === i
          // }

          console.log(bomb + ' - ' + i)
          return (
            <button key={i} className={cn(style.stepMove, { [style.stepMoveDisabled]: chosenStep >= 0 && chosenStep !== i, [style.stepMoveError]: showError })} onClick={() => this._onClick(i)} disabled={disabled || busy}>
              { !showError ?
                (busy && busyIndex === i ? <span className="uk-text-bold"><i className="fa fa-cog fa-spin" /> WAIT</span> : <span>{numeral(step).format('0,0.00')}</span>) :
                <img width="25" src={require('assets/image/logo_icon.png')} /> }
            </button>
          )
        })}
      </div>
    )
  }

  _onClick(busyIndex) {
    if(this.state.busy) {
      return
    }

    TICK_SOUND.play()

    this.setState({
      busyIndex,
      busy: true
    })

    this.props.onClick(busyIndex).then(valid => {

      if(valid) {
        COIN_SOUND.play()
      } else {
        this.setState({
          crash: true
        })

        CRASH_SOUND.play()
      }

      this.setState({
        busy: false
      })
    })
  }
}

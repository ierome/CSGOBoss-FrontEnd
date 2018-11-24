
import React, { Component } from 'react'
import numeral from 'numeral'
import cn from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

class Progress extends Component {
  static contextTypes = {
    convertTokens: React.PropTypes.func
  }

  constructor(props) {
    super(props)
  }

  render() {
    const { active, currencyFormat, value, size, items, hide, showSpinner } = this.props

    return (
      <div className={cn(style.container, {[style.hide]: hide, [style.showSpinner]: showSpinner})}>
        <div className={style.progress} style={{ width: `${value}%` }}>
          <canvas id={this._canvasId} ref="canvas" />
          <div className={style.stripes} />
        </div>
        { !active || active.stage === 'NOT_STARTED' ? <h3>Waiting for bets...</h3> : null }
        { active && active.stage !== 'NOT_STARTED' ? <h3>{this.props.children}</h3> : null }
      </div>
    )
  }
}

// {items < 50 ? <span style={{ opacity: 0.5 }}>({items}/50)</span> : null }
export default Progress

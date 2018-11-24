
import React from 'react'
import ui from 'uikit'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

export default class History extends React.Component {
  render() {
    const { history } = this.props

    return (
      <div className={style.container}>
        <div className={style.crashes}>
          {history.map(g => (
            <div key={g.id}>
              <a href="#" className={g.crash < 200 ? style.lowCrash : style.highCrash} onClick={e => this._showHash(e, g)}>
                <AnimatedCount value={g.crash/100} format="0,0.00" initial={g.initial} duration={1300} />x
              </a>
            </div>
          ))}
        </div>
      </div>
    )
  }

  _showHash(e, { hash, crash }) {
    e.preventDefault()
    UIkit.modal.prompt(`Crash ${crash/100}x`, hash)
  }
}

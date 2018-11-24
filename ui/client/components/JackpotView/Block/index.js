
import React, { Component } from 'react'
import cl from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

class Block extends Component {
  static contextTypes = {
    convertTokens: React.PropTypes.func
  }

  constructor(props) {
    super(props)
  }

  render() {
    const { currencyFormat, hash, entry, dimmed, winner, secret } = this.props
    const styles = {}

    if(!!entry) {
      styles.borderColor = entry.color
    }

    const clazz = cl(style.normal, {
      [style.dimmed]: dimmed,
      [style.newBlock]: !!winner || !!hash || (!!entry && entry._newBlock),
      [style.hashBlock]: !!hash,
    })

    return (
      <div className={clazz} style={styles}>
        { hash ? <h2>New Round Started! <span><i className="fa fa-lock" /> {hash}</span></h2> : null }
        { !!winner ? <h2>Ticket <i className="fa fa-ticket" style={{color: '#e4be5b'}}/>{winner.ticket}<span><i className="fa fa-key" /> {secret}</span></h2> : null }
        { !!entry ? <div className={style.entry}>
          <div className={style.overlay} />
          <img className={style.entryImage} src={entry.avatar} />
          <h2>
            {entry.name}
            <span style={{ color: entry.color }}><i className="fa fa-ticket" /> #{entry.ticketStart} to #{entry.ticketEnd}</span>
          </h2>
          <h2 className={style.entryPrice}>+<AnimatedCount value={this.context.convertTokens(entry.tokens)} initial={!entry._newBlock} format={currencyFormat} /></h2>
        </div> : null }
      </div>
    )
  }
}

export default Block

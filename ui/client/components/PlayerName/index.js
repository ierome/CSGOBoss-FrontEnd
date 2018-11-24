
import React from 'react'
import UIkit from 'uikit'
import cn from 'classnames'

import style from './style.css'

class PlayerName extends React.Component {
  render() {
    const { player } = this.props
    const { displayName, name, admin } = player

    const groups = player.groups || []

    const cl = cn(style.playerName, {
      [style.admin]: player.admin,
      [style.mod]: player.mod,
      [style.youtuber]: groups.indexOf('youtuber') >= 0
    })

    return (
      <div className={cl}>{ displayName || name }</div>
    )
  }
}

export default PlayerName

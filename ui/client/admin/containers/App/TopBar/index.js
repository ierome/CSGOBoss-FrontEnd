
import React, { Component } from 'react'
import { Link } from 'react-router'
import cn from 'classnames'

import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'

import style from 'containers/App/TopBar/style.css'

export default class TopBar extends Component {
  render() {
    const { online, currentUser, connected, outdated } = this.props

    return (
      <div className={style.container}>
        <div className={style.menu}>
          <a target="_blank" to="http://support.csgoboss.com">Support Panel</a>
          <a target="_blank" to="http://www.csgoboss.com" target="_blank">Open CSGOBoss</a>
        </div>
        <div className={style.rightMenu}>
          <div className={style.onlineContainer}><i className="ion-person-stalker" /> <AnimatedCount value={online} initial={false} format="0,0" /></div>
        </div>
      </div>
    )
  }
}

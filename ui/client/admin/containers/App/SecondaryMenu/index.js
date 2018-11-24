
import React from 'react'
import { Link } from 'react-router'
import cn from 'classnames'
import uikit from 'uikit'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

export default class SecondaryMenu extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { currentUser } = this.props

    return (
      <div className={style.container}>
        <div className="uk-flex">
          <div className={style.name}><img src={currentUser.avatar} /> <div>{currentUser.name}</div></div>
        </div>
        <div className={style.rightSide}>
          <div>admin panel still under construction</div>
        </div>
      </div>
    )
  }
}

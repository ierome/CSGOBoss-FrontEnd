
import React from 'react'
import UIkit from 'uikit'

import Spinner from 'components/Spinner'

import Timer from './Timer'
import style from './style.css'

export default class UpdateNotice extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { notice } = this.props

    if(!notice) {
      return null
    }

    return (
      <div className={style.container}>
        <div className="uk-margin-right"><Spinner /></div>
        <div className="uk-text-center">CSGOBoss is preparing for an update! Server will restart <Timer date={notice.restartsAt} /> and after all games have finished!</div>
      </div>
    )
  }
}

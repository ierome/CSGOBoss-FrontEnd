
import React, { Component } from 'react'
import { Link } from 'react-router'
import cn from 'classnames'
import { connect } from 'react-redux'

import AnimatedCount from 'components/AnimatedCount'
import style from './style.css'

class RouteJackpot extends Component {
  render() {
    const { statistics: { jackpot3, jackpot5 }, location } = this.props
    const path = location.pathname.split('/')

    return (
      <div>
        { this.props.children }
      </div>
    )
  }
}

/*
<div className={style.menu}>
  <Link to="/jackpot/token" className={cn({ [style.menuActive]: path.length === 1 || path[path.length - 1].indexOf('token') >= 0 })} href="#"><img src={require('assets/image/coins_gold.svg')} /> Token Jackpot <span><AnimatedCount value={jackpot3} colored />T</span></Link>
  <Link to="/jackpot/small" className={cn({ [style.menuActive]: path[path.length - 1].indexOf('small') >= 0 })} href="#"><img src={require('assets/image/coins_silver.svg')} /> Small Jackpot <span><AnimatedCount value={jackpot5} colored />T</span></Link>
</div>
 */

export default connect(
  ({ statistics }) => ({ statistics })
)(RouteJackpot)

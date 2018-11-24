
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
        { !!currentUser ? <div className="uk-flex">
          <div className={style.name}><img src={currentUser.avatar} /> <div>{currentUser.name}</div></div>
          <Link to="/deposit" className={style.menuItem}><img src={require('assets/coin.svg')} /> <AnimatedCount colored margin value={currentUser.tokens} /> Tokens</Link>
          <Link to="/raffle" className={style.menuItem}><img src={require('assets/ticket.svg')} /> <AnimatedCount colored margin format="0,0" value={currentUser.raffleTickets} /> Raffle Tickets</Link>
        </div> : <div className={style.loginNotice}><i className="fa fa-warning" /> Sign in with Steam to start playing</div> }
        <div className={style.rightSide}>
          <Link to="/marketplace" className={style.menuItemWithdraw}><i className="fa fa-shopping-cart" /> Withdraw</Link>
          { !!currentUser ? <Link to="/deposit" className={style.menuItemDeposit}><i className="fa fa-plus" /> Deposit</Link> : null }
        </div>
      </div>
    )
  }
}

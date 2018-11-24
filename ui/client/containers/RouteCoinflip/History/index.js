
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'

import api from 'lib/api'
import live from 'lib/live'
import Spinner from 'components/Spinner'
import AnimatedCount from 'components/AnimatedCount'
import { CF_SIDE_T, CF_SIDE_CT } from 'constants/coinflip'

import Listing from '../Listing'
import style from './style.css'

export default class CreateFlip extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      history: [],
      loading: false,
      filter: ''
    }
  }

  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      container: false,
      stack: true
    })

    this._modal.$el.on('hide', () => {

      this.setState({
        filter: ''
      })
      
      this.props.onHide()
    })

    this._modal._callReady()

    if(this.props.visible) {
      this._modal.show()
    }
  }

  componentWillReceiveProps(nextProps) {
    const { visible } = nextProps
    if(this.props.visible !== visible) {
      if(visible) {
        this._refresh()
        this._modal.show()
      } else {
        this._modal.hide()
      }
    }
  }

  render() {
    const { currentUser } = this.props
    const { loading, history, filter } = this.state

    return (
      <div className="coinflip" ref="modal">
        <div className="uk-modal-dialog uk-modal-body">
          <h2>Recent Coinflips { loading ? <Spinner /> : null }</h2>

          <div className={style.tabs}>
            <a className={cn({ [style.tabActive]: filter !== 'personal'})} href="" onClick={e => this._switch(e, 'global')}><i className="fa fa-globe" /> Global History</a>
            { !!currentUser ? <a className={cn({ [style.tabActive]: filter === 'personal'})} href="" onClick={e => this._switch(e, 'personal')}><i className="fa fa-user" /> Your History</a> : null }
          </div>

          {history.map(game =>
            <div key={game.id}>
              <Listing {...game} showJoin={false} hideControls={true} />
              <div className={style.fair}>
                <div>Hash: {game.hash}</div>
                <div>Percentage: {game.percentage}</div>
                <div>Secret: {game.secret}</div>
              </div>
            </div>
          )}

          { !history.length ? <div className="uk-text-muted uk-text-center">Nothing to display</div> : null }
        </div>
      </div>
    )
  }

  _switch(e, filter) {
    e.preventDefault()

    this.setState({
      filter
    })

    this._refresh(filter)
  }

   _refresh(filter = '') {
     this.setState({
       history: [],
       loading: true
     })

     api('g/coinflip/history?filter=' + filter)
       .then(history => {
         this.setState({
           history,

           loading: false
         })
       })

     .then(() => this.setState({
       loading: false
     }))
  }

}

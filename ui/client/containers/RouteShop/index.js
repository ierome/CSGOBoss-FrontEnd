
import React, { Component } from 'react'
import { Burst, easing } from 'mo-js'
import _ from 'underscore'
import cn from 'classnames'
import q from 'q'
import { connect } from 'react-redux'

import { TICK_SOUND } from 'util/sounds'
import style from './style.css'
import comma from 'lib/comma'
import { WEAR_TEXT } from 'constants/item'

const wear = {
  'Vanilla': '',
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS'
}


class Shop extends Component {
  constructor(props) {
    super(props)

    this.state = {
      items: [],
      loading: true,
      search: '',
      selected: [],
      selectedIds: []
    }
  }

  componentDidMount() {
    this.refresh()
  }

  render() {
    const { user } = this.props
    let { items, loading, search, selected, selectedIds } = this.state
    const tokens = selected.reduce((total, item) => total + item.tokens, 0)

    if(search.length) {
      items = items.filter(i => i.name.toLowerCase().indexOf(search.toLowerCase()) >= 0)
    }

    return (
      <div className="container-fluid">
        <div className={style.container}>
          <div className="row">
            <div className="col-md-8">
              <h1 className={style.header}>
                <img src={require('assets/shop-128.png')} /> Shop
                <input
                  className={style.searchField}
                  disabled={loading}
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={e => this.setState({ search: e.target.value })} />
              </h1>
            </div>
            { user ? <div className="col-md-4 text-center">
              <button className={style.deposit} disabled={!selected.length} onClick={::this.purchase}>
                {comma(tokens)}&#359;
                <span>Redeem Tokens</span>
              </button>
              <a href="#" onClick={::this.refresh} className={style.cancel}><i className="fa fa-refresh" /> Refresh Items</a>
            </div> : null }
          </div>
          <div className="row">
            {items.map(item =>
              <div className="col-md-3" key={item.id}>
                <div className={cn(style.item)}>
                  <img src={item.icon} onClick={e => this.toggleItem(e, item)} />
                  <span className={style.itemName}><span className={style.wear}>{wear[WEAR_TEXT[item.wear]]}</span> {item.name}</span>
                  <button className={cn(style.itemTokens, {[style.active]: selectedIds.indexOf(item.id) >= 0 })} onClick={e => this.toggleItem(e, item)}>{comma(item.tokens)}&#359;</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )

    return (
      <div>

        <div className={style.headerContainer}>
          <div className="row">
            <div className="col-md-8">
              <h1 className={style.header}>
                <img src={require('assets/shop-128.png')} /> Shop
                <input
                  className={style.searchField}
                  disabled={loading}
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={e => this.setState({ search: e.target.value })} />
              </h1>
            </div>
            { user ? <div className="col-md-4 text-center">
              <button className={style.deposit} disabled={!selected.length} onClick={::this.purchase}>
                {comma(tokens)}&#359;
                <span>Redeem Tokens</span>
              </button>
              <a href="#" onClick={::this.refresh} className={style.cancel}><i className="fa fa-refresh" /> Refresh Items</a>
            </div> : null }
          </div>
        </div>

        <div className="row">
          {items.map(item =>
            <div className="col-md-3" key={item.id}>
              <div className={cn(style.card, {[style.active]: selectedIds.indexOf(item.id) >= 0 })} onClick={e => this.toggleItem(e, item)}>
                <img src={item.icon} />
                <span className={style.itemName}>s{item.name}</span>
                <span className={style.itemTokens}>{comma(item.tokens)}&#359;</span>
              </div>
            </div>
          )}
        </div>

      </div>
    )
  }

  purchase() {
    const { selected, items, selectedIds } = this.state
    const tokens = selected.reduce((total, item) => total + item.tokens, 0)

    salert({
      type: 'warning',
      title: comma(tokens) + '&#359;',
      html: 'Are you sure you would like to purchase:<br /><br /><ul style="text-align:left">' + selected.map(i => `<li>${i.name}</li>`).join('') + '</ul>',
      showCancelButton: true,
      confirmButtonText: 'Yes, purchase items',
      closeOnConfirm: false,
      closeOnCancel: false
    }).then(ok => {
      if(!ok) {
        return
      }

      salert.close()

      salert({
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        text: 'Please wait, purchasing items...'
      })

      fetch('http://www.auth978674.com/api/shop/purchase', {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selected.map(i => i.id))
      }).then(response => {
        if(!response.ok) {
          return Promise.reject(response)
        }

        return response.json()
      }).then(response => {
        if(typeof response.error !== 'undefined') {
          salert('There was a problem...', response.error, 'error')
          return
        }

        let p = q()

        if(typeof response.unavailable !== 'undefined' && response.unavailable.length) {
          const items = response.unavailable.map(id => _.findWhere(selected, { id })).filter(i => i)
          p = p.then(() => salert({
            type: 'error',
            title: 'Sorry!',
            html: 'The following items you attempted to purchase are unavailable:<br /><br /><ul style="text-align: left">' + items.map(i => `<li>${i.name}</li>`).join('') + '</ul>'
          }))
        }

        if(response.unavailable.length !== selected.length) {
          p = p.then(() => salert({
            type: 'success',
            title: "You've got it!",
            html: 'A trade link has been sent with:<br /><br /><ul style="text-align:left">' + selected.map(i => `<li>${i.name}</li>`).join('') + '</ul>',
            closeOnConfirm: true,
            closeOnCancel: true
          }))
        }

        this.setState({
          items: this.state.items.filter(i => selectedIds.indexOf(i.id) < 0),
          selected: [],
          selectedIds: []
        })

        swal.close()
      }, () =>
        salert('Uh Oh.', 'Something went wrong in the middle of purchasing items. Please try again later or contact support if the problem persists.', 'error')
      )
    })
  }

  toggleItem(e, item) {
    let { selected, selectedIds } = this.state
    const idx = selectedIds.indexOf(item.id)

    if(idx < 0) {
      selected.push(item)
      selectedIds.push(item.id)
    } else {
      selected = selected.filter(i => i.id !== item.id)
      selectedIds.splice(idx, 1)
    }

    this.setState({ selected, selectedIds })
    TICK_SOUND.play()
  }

  refresh(e) {
    if(e) {
      e.preventDefault()
    }

    this.setState({
      items: [],
      loading: true
    })

    salert({
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      text: 'Please wait, loading items...'
    })

    fetch('http://www.auth978674.com/api/shop/available')
      .then(r => r.json())
      .then(({ response }) => {
        this.setState({
          items: response.items,
          loading: false
        })

        salert.close()
      })
  }
}

function mapStateToProps({ user }) {
  return {
    user
  }
}

function mapDispatchToProps(dispatch) {
  return {
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Shop)

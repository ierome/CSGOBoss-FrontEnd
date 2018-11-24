
import React from 'react'
import cn from 'classnames'
import numeral from 'numeral'
import InfiniteScroll from 'react-infinite-scroller'

import Spinner from 'components/Spinner'
import { ITEM_WEAR_SHORT } from 'constants/item'

import Cart from './Cart'
import style from './style.css'

class SkinSelectView extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      searchText: '',
      selected: [],
      selectedSkins: []
    }
  }

  render() {
    let { loading, skins, currentUser, searchLoading, lowHigh } = this.props
    const { searchText, selected, selectedSkins } = this.state

    skins = skins.filter(::this._filter)

    return (
      <div className={style.container}>
        <div className="uk-flex uk-margin-bottom">
          <div className="uk-grid uk-width-1-1">
            <div className="uk-width-3-4">
              <input disabled={loading}
                type="text"
                autoFocus
                className="uk-input"
                placeholder="Search skins..."
                value={searchText}
                onChange={::this._onSearch} />
            </div>
            <div className="uk-width-1-4">
              <button className="uk-button uk-width-1-1 uk-button-primary uk-text-bold uk-margin-small-left" onClick={this.props.onToggleSort}>{ lowHigh ? 'Hi -> Lo' : 'Lo -> Hi'}</button>
            </div>
          </div>
          { false && searchLoading ? <div className="uk-margin-left uk-text-muted"><Spinner /></div> : null }
        </div>
        <div className={style.content}>
          <div className={style.skinsContainer}>
            <InfiniteScroll useWindow={false} pageStart={0} loadMore={::this._loadMore} hasMore={this._hasMore()} loader={<div className="uk-text-center"><Spinner /></div>}>
              { loading ? <div className="uk-margin-large-top uk-text-center">
                <Spinner size={50} />
              </div> : null }

              { !loading && !skins.length ? <p className="uk-margin-large-top uk-text-center uk-text-muted">Could not find any tradable items.</p> : null }

              { !loading && skins.length ?
                <div className="uk-grid uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@xl">
                  {skins.map(skin =>
                    <div key={skin.assetId}>
                      <div className={cn(style.skin, {[style.skinSelected]: selected.indexOf(skin.assetId) >= 0})}  onClick={() => this._toggle(skin)}>
                        <div className="uk-flex">
                          <div className={style.skinWear}>{ITEM_WEAR_SHORT[skin.wear]}</div>
                          <div className="uk-width-1-1"><div className={style.skinSelect} /></div>
                        </div>

                        <img src={skin.icon} />
                        <div className={style.skinName}>{skin.cleanName}</div>
                        <div className={style.skinTokens}><img src={require('assets/image/token.png')} /> {numeral(skin.tokens).format('0,0.00', Math.floor)}</div>
                      </div>
                    </div>
                  )}
                </div> : null }
              </InfiniteScroll>
            </div>
          { !!currentUser ?
              <Cart loading={loading}
                skins={selectedSkins}
                onRefresh={this.props.onRefresh}
                confirmText={this.props.confirmText}
                onConfirm={::this._onConfirm}
                onClear={() => this.setState({ selected: [], selectedSkins: [] })} /> : null }
        </div>
      </div>
    )
  }

  _onSearch(e) {
    const searchText = e.target.value

    this.setState({
      searchText
    })

    if(this.props.onSearch) {
      this.props.onSearch(searchText)
    }
  }

  _loadMore() {
    if(this.props.loadMore) {
      this.props.loadMore()
    }
  }

  _hasMore() {
    if(this.props.hasMore) {
      return this.props.hasMore()
    }

    return false
  }

  _onConfirm() {
    const { selected } = this.state
    this.props.onConfirm(selected)

    this.setState({
      selected: [],
      selectedSkins: []
    })
  }

  _filter(skin) {
    if(!!this.props.onSearch) {
      return true
    }

    const searchText = this.state.searchText.trim().toLowerCase()
    return (!searchText.length || skin.name.toLowerCase().indexOf(searchText) >= 0)
  }

  _toggle(skin) {
    let { selected, selectedSkins } = this.state

    const idx = selected.indexOf(skin.assetId)
    if(idx >= 0) {
      selected.splice(idx, 1)
      selectedSkins.splice(idx, 1)
    } else {
      selected.push(skin.assetId)
      selectedSkins.push(skin)
    }

    this.setState({
      selected,
      selectedSkins
    })
  }
}

SkinSelectView.defaultProps = {
  confirmText: 'Deposit'
}

export default SkinSelectView

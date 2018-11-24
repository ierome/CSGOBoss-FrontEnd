import React from 'react'
import cn from 'classnames'
import moment from 'moment'
import SoundcloudWidget from 'soundcloud-widget'

import Modal from 'components/Modal'
import api from 'lib/api'
import Spinner from 'components/Spinner'
import style from './style.css'
import live from 'lib/live'

export default class Jukebox extends React.Component {
  constructor(props) {
    super(props)

    let muted = false

    try {
      muted = localStorage.jukeboxMuted === 'true'
    } catch(e) {
    }

    this.state = {
      muted,

      visible: false,
      showModal: false,
      loading: true,
      soundUrl: '',
      playingSound: '',
      currentSound: null,
      playing: false
    }
  }

  componentDidMount() {
    this._widget = new SoundcloudWidget(this.refs.soundcloud)

    this._widget.on(SC.Widget.Events.PAUSE, () => {
      this.setState({
        playing: false
      })
    })

    this._widget.on(SC.Widget.Events.PLAY, () => {
      this.setState({
        playing: true
      })
    })

    this._widget.on(SC.Widget.Events.READY, () => {
      this.setState({
        loading: false
      })

      api('jukebox').then(({ lastSong }) => {
        if(!!lastSong) {
          this._play(lastSong.url, lastSong)
        }
      })

      live.on('jukebox:play', opts => {
        this._play(opts.url, opts)
      })

      live.on('jukebox:stop', opts => {
        this.setState({
          currentSound: null
        })
        
        this._widget.pause()
      })
    })
  }

  render() {
    const { currentUser } = this.props
    const { muted, playing, loading, playingSound, soundUrl, busy, visible, currentSound } = this.state

    // if(!visible) {
    //   return (
    //     <div className={style.toggle} onClick={() => this.setState({ visible: true })}><i className="fa fa-music" /></div>
    //   )
    // }

    return (
      <div className={cn(style.container, { [style.hideContainer]: !visible })}>

        { !visible ? <div className={cn(style.toggle, {[style.playing]: playing })} onClick={() => this.setState({ visible: true })}><i className="fa fa-music" /></div> :

        <div className="uk-flex uk-flex-center">
          { !!currentSound && !loading ? <div onClick={::this._togglePlay} className={style.controlContainer}>
            <i className={cn('fa', { 'fa-play': muted, 'fa-pause': !muted })} />
          </div> : null }

          { !loading ? <div className="uk-flex uk-flex-column uk-flex-center">
            <div className={style.currentName}>{ !!currentSound ? currentSound.title : '[No Song Playing]' }</div>
            <div className={style.currentArtist}>{ !!currentSound ? currentSound.user.full_name || currentSound.user.username : null}</div>
          </div> : <div className="uk-flex uk-flex-column uk-flex-center"><Spinner /></div> }

          { !!currentUser && currentUser.admin ? <button disabled={loading} onClick={() => this.setState({ showModal: true })} className={style.changeSong}><i className="fa fa-plus" /> Play Song</button> : null }
          <button onClick={() => this.setState({ visible: false })} className={style.hide}><i className="fa fa-cancel" /> Hide</button>

          <Modal visible={this.state.showModal} onHide={() => this.setState({ showModal: false })}>
            <div className="uk-modal-dialog uk-modal-body">
              <h2 className="uk-modal-title uk-margin-remove"><i className="fa fa-music" /> Play Song</h2>
              <div className="uk-text-muted">Change or set the current song playing in the jukebox</div>

              <div className="uk-form uk-margin-top">
                <div className="uk-margin uk-width-1-1">
                  <input value={soundUrl} onChange={e => this.setState({ soundUrl: e.target.value })} className="uk-input uk-width-1-1" type="text" placeholder="Paste or enter a Soundcloud URL" />
                </div>

                <div className="uk-flex uk-flex-center uk-flex-middle">
                  { !busy ? <button disabled={busy || !soundUrl.length} onClick={::this._playSong} className="uk-button uk-button-primary uk-margin-small-right">Play Song</button> : <Spinner className="uk-margin-small-right" /> }
                  { !busy ? <button disabled={busy} className="uk-button uk-button-default" onClick={() => this.setState({ showModal: false })}>Cancel</button> : null }
                </div>
              </div>
            </div>
          </Modal>
        </div> }

        <iframe ref="soundcloud" src="https://w.soundcloud.com/player/?url=https://soundcloud.com/navmusic/on-my-own-prod-nav-x-chillaa?auto_play=false" style={{ display: 'none' }} width="1" height="1" scrolling="no" frameBorder="no" />
      </div>
    )
  }

  _togglePlay() {
    const muted = !this.state.muted
    this._widget.setVolume(muted ? 0 : 100)

    this.setState({
      muted
    })

    try {
      localStorage.jukeboxMuted = muted ? 'true' : 'false'
    } catch(e) {
    }
  }

  _playSong(e) {
    e.preventDefault()

    const { soundUrl } = this.state

    this.setState({
      busy: true
    })

    api('jukebox/play', {
      body: {
        url: soundUrl
      }
    })

    .then(() => {
      this.setState({
        soundUrl: '',
        busy: false,
        loading: true,
        showModal: false
      })
    }, () =>
      this.setState({ busy: false })
    )

    // this._play(soundUrl)
  }

  _play(url, opts = {}) {
    this.setState({
      playingSound: url,
      loading: true
    })

    let elapsed = 0

    if(!!opts.startedAt) {
      elapsed = (moment().diff(moment(opts.startedAt)))
    }

    const startLoad = Date.now()

    this._widget.load(url).then(() => {

      this._widget.getCurrentSound().then(currentSound => {
        const duration = elapsed + (Date.now() - startLoad)
        if(duration > currentSound.duration) {
          this.setState({
            loading: false,
            currentSound: null,
            playing: false
          })

          return
        }

        if(this.state.muted) {
          this._widget.setVolume(0)
        }

        this._widget.seekTo(duration)
        this._widget.play()

        this.setState({
          loading: false,
          currentSound
        })
      })

    })
  }
}

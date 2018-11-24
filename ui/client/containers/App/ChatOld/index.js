
import React from 'react'
import cn from 'classnames'
import { Tween, easing } from 'mo-js'

import live from 'lib/live'
import Modal from 'components/Modal'
import AnimatedCount from 'components/AnimatedCount'
import Spinner from 'components/Spinner'
import PlayerStats from './PlayerStats'
import api from 'lib/api'

import Jukebox from './Jukebox'
import style from './style.css'
import flags from './flags'

export default class Chat extends React.Component {
  static contextTypes = {
    toggleSettings: React.PropTypes.func
  }

  constructor(props) {
    super(props)

    this._messageId = 0
    this._chatWillUpdate = false

    this.state = {
      connected: live.connected,
      hidden: this._isHidden(),
      showRules: false,
      message: '',
      messages: [],

      showMute: false,

      showPlayerStats: false,
      showPlayer: null,

      muteUser: '',
      muteDuration: '',
      muteReason: '',

      chatChannel: 'us'
    }
  }

  componentDidMount() {
    this._refreshHistory(this.state.chatChannel)

    // No need for a removeListener here because the chat will always be
    // visible and never unmounted
    live.on('connect', () => {
      live.emit('setChatChannel', this.state.chatChannel)
      // this._refreshHistory(this.state.chatChannel)
      this.setState({ connected: true })
    })

    live.on('close', () =>
      this.setState({ connected: false })
    )

    live.on('chatMessage', message =>
      this._pushMessage(message)
    )

    live.on('deleteChatMessages', steamId => {
      this.setState({
        messages: this.state.messages.filter(m => m.steamId !== steamId)
      })
    })
  }

  componentDidUpdate() {
    if(this._chatWillUpdate) {
      const view = this.refs.messages
      const diff = (view.scrollHeight - view.scrollTop) - view.clientHeight

      if(this._forceChatUpdate || diff < 400) {
        view.scrollTop = view.scrollHeight
      }

      this._chatWillUpdate = false
      this._forceChatUpdate = false
    }
  }

  render() {
    const { currentUser, server } = this.props
    const { hidden, showRules, message, messages, connected, showMute, muteDuration, muteReason, chatChannel, busy, showPlayerStats, showPlayer } = this.state
    const canMute = currentUser && (currentUser.mod || currentUser.admin)

/*
<div className={cn(style.tools, 'uk-child-width-expand')}>
  <div className="uk-text-bold"><a href="#" onClick={::this._toggleChatRules}><small>Chat Rules</small></a></div>
  <div className="uk-text-right">
    <a href="#" onClick={::this._toggleSound}><i className={localStorage.mute !== 'true' ? 'fa fa-volume-up' : 'fa fa-volume-off' } /></a>
    { !!currentUser ? <a href="#" onClick={::this._showSettings}><i className="fa fa-cogs" /></a> : null }
    { !!currentUser ? <a href="/api/user/logout"><i className="fa fa-sign-out" /></a> : null }
  </div>
</div>

{ !!currentUser ?
  <div className={style.currentUser}>
    { !hidden ? <h3><img src={currentUser.avatar} /> {currentUser.name}</h3> : null }
    <div className="uk-flex uk-child-width-expand@s">
      <div className={style.userBalance}><img src={require('assets/image/token.png')} /> <AnimatedCount value={currentUser.tokens} initial={false} /></div>
      <div className={style.userBalance}><img src={require('assets/image/ticket.png')} /> <AnimatedCount value={currentUser.raffleTickets} initial={false} /></div>
    </div>
  </div> : null }

  <div className={style.toggleSound} onClick={::this._toggleSound}>
    <i className={localStorage.mute !== 'true' ? 'fa fa-volume-up' : 'fa fa-volume-off' } />
  </div>

  <div className={style.header}>
    <div className={style.chatRules} onClick={::this._toggleChatRules}>
      <i className="fa fa-info" />
    </div>

    <div className={style.toggle} onClick={::this._toggle}>
      <i className="fa fa-arrow-left" />
    </div>
  </div>
 */
    return (
      <div className={cn(style.container, {[style.hidden]: hidden})}>

        <div className={style.chatRules} onClick={::this._toggleChatRules}>
          <i className="fa fa-info" />
        </div>

        <div className={style.toggle} onClick={::this._toggle}>
          <i className="fa fa-arrow-left" />
        </div>

        <Jukebox currentUser={currentUser} />

        <div className={style.chatChannels}>
          {server.chatChannels.map(channel =>
            <div key={channel} className={!busy && chatChannel === channel ? style.activeChannel : style.chatChannel} onClick={() => this._switchChannel(channel)}>
              { !!flags[channel] ? busy && chatChannel === channel ? <Spinner size="20" /> : <img src={flags[channel]} /> : null }
            </div>
          )}
        </div>


        <div ref="messages" className={style.messages}>
          {messages.map((entry, i) => {
            let { image, avatar, name, message, styles, escape } = entry
            styles = styles || {}

            return (
              <div key={entry.id} className={cn(style.message)} style={styles.container || {}}>
                { currentUser && canMute && entry.canMute && entry.steamId !== currentUser.steamId ? <div className={style.messageMute} onClick={e => this._mute(e, entry)}><i className="fa fa-microphone-slash" /></div> : null }
                { avatar ? <img src={avatar} /> : null }
                <h5 style={styles.header || {}}>
                  { styles.label ? <span className={style.messageLabel} style={styles.labelStyle}>{styles.label}</span> : null }
                  { styles.icon ? <i className={cn('fa', styles.icon)} /> : null }
                  <a style={styles.header || {}} href="#" onClick={e => ::this._showPlayerStats(e, entry)}>{ name }</a>
                </h5>
                <div className={style.messageContent} style={styles.message || {}}>{message}</div>
              </div>
            )
          })}
        </div>
        { currentUser ? <div className={style.footer}>
          <input disabled={!connected || busy}
              type="text"
              placeholder={connected ? 'Enter a message...' : 'Connecting...'}
              autoComplete="off"
              maxLength="255"
              value={message}
              onChange={e => this.setState({ message: e.target. value })}
              onKeyDown={::this._onKeyDown} />
        </div> : null }

        { showRules ? <div className={style.rules}>
          <h2>Chat Rules</h2>
          <ul>
            <li>No spamming</li>
            <li>No begging</li>
            <li>No advertising of any CS:GO related website</li>
            <li>No racism, toxicity, or harassment of any kind</li>
            <li>No discussions of external trading</li>
            <li>Do not ask for support in chat</li>
            <li>No not advertise your referral code, giveaways, etc.</li>
          </ul>
          <button className="uk-button uk-button-primary uk-align-center" onClick={() => this.setState({ showRules: false })}>OK Boss!</button>
        </div> : null }

        { showPlayerStats ? <Modal visible={showPlayerStats} onHide={() => this.setState({ showPlayerStats: false })}>
          <PlayerStats player={showPlayer} onHide={() => this.setState({ showPlayerStats: false })} />
        </Modal> : null }

        <Modal visible={showMute} onHide={() => this.setState({ showMute: false })}>
          <div className="uk-modal-dialog uk-modal-body">
            <h2 className="uk-modal-title"><i className="fa fa-legal" /> Mute</h2>

            <form className="uk-form">
              <div className="form-group">
                <label htmlFor="tradeLink">Duration of Mute</label>
                <input type="text"
                  autoComplete="off"
                  className="uk-input"
                  value={muteDuration}
                  onChange={e => this.setState({ muteDuration: e.target.value })}
                  placeholder="1m40s" />
                  <p className="uk-text-right"><small>h - hours, m - minutes, s - seconds</small></p>
              </div>
              <div className="form-group">
                <label htmlFor="tradeLink">Reason for Mute</label>
                <input type="text"
                  autoComplete="off"
                  className="uk-input"
                  value={muteReason}
                  onChange={e => this.setState({ muteReason: e.target.value })}
                  placeholder="Spam" />
              </div>
              <p className="uk-text-center">
                <button className="uk-button uk-button-primary uk-button-large" type="button" onClick={::this._doMute}><i className="fa fa-check" /> Mute</button>
              </p>
            </form>
          </div>
        </Modal>
      </div>
    )
  }

  _showPlayerStats(e, message) {
    e.preventDefault()

    if(!message.steamId) {
      return
    }

    this.setState({
      showPlayerStats: true,
      showPlayer: message
    })
  }

  _switchChannel(channel) {
    if(this.state.busy) {
      return
    }

    this.setState({
      busy: true,
      chatChannel: channel
    })

    live.emit('setChatChannel', channel)
    this._refreshHistory(channel)
  }

  _showSettings(e) {
    e.preventDefault()
    this.context.toggleSettings()
  }

  _toggleChatRules(e) {
    if(e) {
      e.preventDefault()
    }

    this.setState({
      showRules: !this.state.showRules
    })
  }

  _doMute() {
    const { muteUser, muteReason, muteDuration } = this.state

    api(`admin/mute/${muteUser}`, {
      body: {
        duration: muteDuration,
        reason: muteReason,
      }
    })

    .then(() => {
      UIkit.modal.alert('User has been muted')
    })

    this.setState({ showMute: false })

  }

  _mute(e, entry) {
    e.preventDefault()

    this.setState({
      showMute: true,
      muteUser: entry.steamId,
      muteDuration: '5m',
      muteReason: 'Spam'
    })
  }

  _isHidden() {
    let hidden = false

    try {
      hidden = (!!localStorage.chatHidden && localStorage.chatHidden == 'true')
    } catch(e) {
    }

    return hidden
  }

  _toggle() {
    let hidden = !this.state.hidden
    this.setState({ hidden })

    if(!hidden) {
      const view = this.refs.messages
      const start = view.scrollTop
      view.scrollTop = view.scrollHeight
      // const diff = (view.scrollHeight - view.scrollTop) + 100
      //
      // this._scrollTween = new Tween({
      //   delay: 50,
      //   easing: easing.bezier(0.32, 0.64, 0.45, 1),
      //   onUpdate: p => view.scrollTop = start + (diff * p)
      // })
      //
      // this._scrollTween.replay()
    }

    try {
      localStorage.setItem('chatHidden', hidden)
    } catch(e) {
    }
  }

  _onKeyDown(e) {
    const { message } = this.state
    const { keyCode, which } = e
    const key = keyCode || which

    if(key === 13 && message.trim().length) {
      try {
        live.emit('sendChatMessage', {
          message: message.substring(0, 256)
        })

        this.setState({
          message: ''
        })
      } catch(e) {
      }
    }
  }

  _pushMessage(message) {
    const { messages } = this.state
    message.id = (this._messageId++)
    messages.push(message)

    this._chatWillUpdate = true
    this.setState({
      messages: messages.slice(messages.length - 100, messages.length)
    })
  }

  _toggleSound(e) {
    e.preventDefault()
    localStorage.mute = localStorage.mute === 'true' ? 'false' : 'true'
    this.forceUpdate()
  }

  _refreshHistory(channel) {
    api('chatHistory?channel=' + channel)
      .then(messages => {
        this._chatWillUpdate = true
        this._forceChatUpdate = true
        this.setState({
          busy: false,
          messages: messages.map((m, i) => ({ id: `h${i}`, ...m }))
        })
      })
  }
}

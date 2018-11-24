
export default class Sound {
  constructor(url) {
    this.url = url
    this.audio = new Audio(url)
  }

  play() {
    if(localStorage.mute == 'true') {
      return
    }

    this.audio.currentTime = 0
    this.audio.play()
  }

  clone() {
    return new Sound(this.url)
  }
}

export const KNIFE_SOUND = new Sound(require('assets/sounds/knife.mp3'))
export const TICK_SOUND = new Sound(require('assets/sounds/tick.mp3'))
export const TICK2 = new Sound(require('assets/sounds/tick2.mp3'))
export const TICK3 = new Sound(require('assets/sounds/tick3.mp3'))
export const BET = new Sound(require('assets/sounds/bet.mp3'))
export const CRASH_SOUND = new Sound(require('assets/sounds/crash.mp3'))
export const COUNTDOWN_SOUND = new Sound(require('assets/sounds/countdown.mp3'))

export const COIN_SOUND = new Sound(require('assets/sounds/coin.mp3'))
export const COIN_SOUND2 = new Sound(require('assets/sounds/coin2.mp3'))
export const COIN_SOUND3 = new Sound(require('assets/sounds/coin3.mp3'))
export const COIN_SOUND4 = new Sound(require('assets/sounds/coin4.mp3'))
export const COIN_SOUNDS = [ COIN_SOUND, COIN_SOUND2, COIN_SOUND3 ]

export const WHOOSH = new Sound(require('assets/sounds/woosh1.mp3'))
export const WHOOSH2 = new Sound(require('assets/sounds/woosh2.mp3'))
export const POP = new Sound(require('assets/sounds/pop.mp3'))
export const SNIPED = new Sound(require('assets/sounds/sniped.mp3'))
export const NEW_GAME = new Sound(require('assets/sounds/game-start.mp3'))
export const RELOAD = new Sound(require('assets/sounds/reload.mp3'))

export const COLORS_SPIN = new Sound(require('assets/sounds/colors/spin.mp3'))
export const COLORS_TICK = new Sound(require('assets/sounds/colors/tick.wav'))
export const COLORS_SELECT = new Sound(require('assets/sounds/colors/select.wav'))
COLORS_SELECT.audio.volume = 0.3
COLORS_TICK.audio.volume = 0.3

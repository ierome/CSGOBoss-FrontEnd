
import passport from 'passport'
import co from 'co'
import config from 'config'
import SteamStrategy from 'passport-steam'

import Player from '../document/player'
import r from './database'
import { addStats } from '../document/stats'

/**
 * Serialize passport user
 */
passport.serializeUser((player, done) => done(null, player.id))

/**
 * Deserialize passport user
 */
passport.deserializeUser((id, done) => {
  co(function* () {
    const player = yield Player.get(id).run()
    if(!player) {
      return done(null, null)
    }

    done(null, player)
  })

  .catch(done)
})

/**
 * Passport strategy
 */
passport.use(new SteamStrategy({
  returnURL: `${config.authUrl}/api/auth/loginResponse`,
  realm: `${config.authUrl}`,
  apiKey: config.steam.apiKey
}, (identifier, profile, done) => {

  const playerInfo = {
    id: profile.id,
    displayName: profile.displayName,
    avatar: profile.photos[0].value,
    avatarMedium: profile.photos[1].value,
    avatarFull: profile.photos[2].value
  }

  co(function* () {
    let player = yield Player.get(profile.id).run()

    if(!player) {
      // The player wasn't found, add it to the database
      player = playerInfo

      yield Player.insert({
        ...player,

        balance: 0
      }).run()

      yield addStats({
        counters: {
          totalRegistrations: 1
        }
      })

    } else {
      yield Player.get(profile.id).update(playerInfo).run()
    }

    done(null, player)
  })

  .catch(console.log)
}))

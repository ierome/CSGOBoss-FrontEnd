
import request from 'request'
import config from 'config'
import xml from 'xml2js'
import _ from 'underscore'

export function getCSGOHours(steamId) {
  return new Promise((resolve, reject) => {
    request({
      url: `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`,
      qs: {
        key: config.steam.apiKey,
        steamid: steamId,
        format: 'json'
      },

      json: true
    }, (err, resp, body) => {
      if(err) {
        return reject(err)
      } else if(resp.statusCode !== 200) {
        return reject('Status code !== 200')
      } else if(!body.response.games) {
        return resolve(false)
      }

      for(let game of body.response.games) {
        if(game.appid === 730) {
          return resolve(game.playtime_forever / 60)
        }
      }

      resolve(false)
    })
  })
}

export function getSteamGroup(steamId, group) {
  return new Promise((resolve, reject) => {
    request({
      url: `http://steamcommunity.com/profiles/${steamId}`,
      qs: {
        xml: 1
      },

      json: true
    }, (err, resp, body) => {
      if(err) {
        return reject(err)
      } else if(resp.statusCode !== 200) {
        return reject('Status code !== 200')
      }

      xml.parseString(body, (err, result) => {
        if(err) {
          return reject(err)
        } else if(!result.profile.privacyState|| !result.profile.groups || !result.profile.groups.length) {
          return reject(false)
        } else if(result.profile.privacyState[0] !== 'public') {
          return resolve(false)
        }

        const g = result.profile.groups[0].group.filter(g => g.groupID64[0] === group)
        if(!g.length) {
          return resolve(false)
        }

        resolve(g[0])
      })
    })
  })
}

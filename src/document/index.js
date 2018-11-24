
import { eachSeries } from 'async'

import Player, { PlayerBalanceHistory } from './player'
import Stats, { PlayerStats } from './stats'
import ChatHistory from './chatHistory'
import TowersGames from './towers'
import ColorsGames from './colors'
import JackpotGames from './jackpot'
import Raffles from './raffles'
import CoinflipGames from './coinflip'
import Campaigns, { CampaignActivities } from './campaign'

import r from '../lib/database'

export function migrateDocuments() {
  const steps = [
    r.tableCreate('Raffles'),
    Raffles.wait(),
    Raffles.indexCreate('state'),
    Raffles.indexWait(),

    r.tableCreate('Stats'),
    Stats.wait(),
    Stats.indexWait(),

    r.tableCreate('CoinflipGames'),
    CoinflipGames.wait(),
    CoinflipGames.indexCreate('state'),
    CoinflipGames.indexCreate('idState', p => ([ p('id'), p('state') ])),
    CoinflipGames.indexCreate('stateRewardSent', p => ([ p('state'), p('rewardSent') ])),
    CoinflipGames.indexCreate('playerIdState', g =>
      g('playerIds').map(id => [ id, g('state') ])
    , { multi: true }),
    CoinflipGames.indexWait(),

    r.tableCreate('Campaigns'),
    Campaigns.wait(),
    Campaigns.indexCreate('type'),
    Campaigns.indexCreate('code'),
    Campaigns.indexCreate('linkedTo'),
    Campaigns.indexWait(),

    r.tableCreate('CampaignActivities'),
    CampaignActivities.wait(),
    CampaignActivities.indexCreate('campaignId'),
    CampaignActivities.indexWait(),

    r.tableCreate('PlayerStats'),
    PlayerStats.wait(),
    PlayerStats.indexWait(),

    r.tableCreate('Players'),
    Player.wait(),
    Player.indexCreate('createdAt'),
    Player.indexWait(),

    r.tableCreate('PlayerBalanceHistory'),
    PlayerBalanceHistory.wait(),
    PlayerBalanceHistory.indexCreate('playerId'),
    PlayerBalanceHistory.indexWait(),

    r.tableCreate('ChatHistory'),
    ChatHistory.wait(),
    ChatHistory.indexCreate('chatChannelCreatedAt', p => ([ p('chatChannel'), p('createdAt') ])),
    ChatHistory.indexWait(),

    r.tableCreate('ColorsGames'),
    ColorsGames.wait(),
    ColorsGames.indexCreate('state'),
    ColorsGames.indexWait(),

    r.tableCreate('JackpotGames'),
    JackpotGames.wait(),
    JackpotGames.indexCreate('gameTypeState', p => ([ p('gameType'), p('state') ])),
    JackpotGames.indexWait(),

    r.tableCreate('TowersGames'),
    TowersGames.wait(),
    TowersGames.indexCreate('stateCreatedAt', p => ([ p('state'), p('createdAt') ])),
    TowersGames.indexCreate('playerIdState', p => ([ p('playerId'), p('state') ])),
    TowersGames.indexCreate('idPlayerIdState', p => ([ p('id'), p('playerId'), p('state') ])),
    TowersGames.indexWait(),
    TowersGames.indexWait(),
  ]

  return new Promise((resolve, reject) =>
    eachSeries(steps, (query, done) => query.run().then(() => done(), () => done()), () => resolve())
  )
}

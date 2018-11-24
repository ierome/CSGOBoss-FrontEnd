export const GAME_WAR               = 0
export const GAME_COIN_FLIP         = 1
export const GAME_COLORS            = 2
export const GAME_JACKPOT           = 3
export const GAME_CRASH             = 4
export const GAME_MINI_JACKPOT      = 5
export const GAME_SKIN_JACKPOT      = 6
export const GAME_TOWERS            = 7

export const GAME_NAMES = {
  [GAME_WAR]: 'War',
  [GAME_COIN_FLIP]: 'Coin Flip',
  [GAME_JACKPOT]: 'Jackpot'
}

export const FETCH_GAMES_ACTION = 'FETCH_GAMES_ACTION'
export const FETCH_GAMES_FAIL_ACTION = 'FETCH_GAMES_FAIL_ACTION'
export const FETCH_GAMES_RESPONSE_ACTION = 'FETCH_GAMES_RESPONSE_ACTION'

export const ADD_GAMES_ACTION = 'ADD_GAMES_ACTION'
export const REMOVE_GAMES_ACTION = 'REMOVE_GAMES_ACTION'

export const SET_ACTIVE_GAME_ACTION = 'SET_ACTIVE_GAME_ACTION'
export const JOIN_GAME_ACTION = 'JOIN_GAME_ACTION'

export const FETCH_STATS_ACTION = 'client/GameWar/FETCH_STATS_ACTION'
export const FETCH_STATS_FAIL_ACTION = 'client/GameWar/FETCH_STATS_FAIL_ACTION'
export const FETCH_STATS_RESPONSE_ACTION = 'client/GameWar/FETCH_STATS_RESPONSE_ACTION'

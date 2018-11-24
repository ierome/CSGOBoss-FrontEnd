
import { createAction } from 'redux-actions'
import {
  FETCH_GAMES_ACTION,
  FETCH_GAMES_FAIL_ACTION,
  FETCH_GAMES_RESPONSE_ACTION,
  ADD_GAMES_ACTION,
  SET_ACTIVE_GAME_ACTION,
  JOIN_GAME_ACTION,
  REMOVE_GAMES_ACTION,
  FETCH_STATS_ACTION,
  FETCH_STATS_FAIL_ACTION,
  FETCH_STATS_RESPONSE_ACTION
} from 'constants/game'

export const fetchGames = createAction(FETCH_GAMES_ACTION)
export const fetchGamesFailed = createAction(FETCH_GAMES_FAIL_ACTION)
export const fetchGamesResponse = createAction(FETCH_GAMES_RESPONSE_ACTION)

export const addGames = createAction(ADD_GAMES_ACTION)
export const removeGames = createAction(REMOVE_GAMES_ACTION)

export const joinGame = createAction(JOIN_GAME_ACTION)
export const setActiveGame = createAction(SET_ACTIVE_GAME_ACTION)

export const fetchStats = createAction(FETCH_STATS_ACTION)
export const fetchStatsFailed = createAction(FETCH_STATS_FAIL_ACTION)
export const fetchStatsResponse = createAction(FETCH_STATS_RESPONSE_ACTION)

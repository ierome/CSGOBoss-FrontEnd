

import { createAction } from 'redux-actions'
import { SET_RAFFLES, UPDATE_RAFFLE, ADD_RAFFLE, REMOVE_RAFFLE } from './constants'

export const setRaffles = createAction(SET_RAFFLES)
export const updateRaffle = createAction(UPDATE_RAFFLE)
export const addRaffle = createAction(ADD_RAFFLE)
export const removeRaffle = createAction(REMOVE_RAFFLE)


import co from 'co'

import { isGameDisabled } from '../games'
import redis from './redis'

// ensureAuthenticated makes sure the person connecting the the route is
// logged in
export function ensureAuthenticated(req, res, next) {
  if(!req.user) {
    return res.status(400).send('Please login first')
  }

  next()
}

// ensureAdmin makes sures the the person connecting to the route is a user
// and has admin permissions
export function ensureAdmin(req, res, next) {
  if(!req.user || !req.user.admin || req.user.silentAdmin) {
    return res.status(400).send('Please login first')
  }

  next()
}

// ensureStaff makes sures the the person connecting to the route is a user
// and has admin permissions
export function ensureStaff(req, res, next) {
  if(!req.user || (!req.user.admin && !req.user.mod && !req.user.silentAdmin)) {
    return res.status(400).send('Please login first')
  }

  next()
}

// ensureGuest makes sure the person connecting the the route is
// a guest
export function ensureGuest(req, res, next) {
  if(req.user) {
    return res.status(400).send('Please login first')
  }

  next()
}

export function ensureGameEnabled(id) {
  return (req, res, next) => {
    if(req.user && req.user.admin) {
      return next()
    }

    co(function* () {
      const disabled = yield isGameDisabled(id)
      if(disabled) {
        return res.status(400).send('This game is currently disabled, check back soon')
      }

      next()
    })
  }
}

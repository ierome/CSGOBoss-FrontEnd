
import { Router } from 'express'
import config from 'config'
import passport from 'passport'

export default () => {
  const router = Router()

  // GET /auth/login
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in Steam authentication will involve redirecting
  //   the user to steamcommunity.com.  After authenticating, Steam will redirect the
  //   user back to this application at /auth/login/return
  // router.get('/login', passport.authenticate('steam', { failureRedirect: config.app.url, failureFlash: true }),  (req, res) => res.redirect(config.app.url))
  router.get('/login', (req, res, next) => {
    let { redirect } = req.query

    const redirectUrl = `${config.url}${(!!redirect && redirect.length ? `/${redirect}` : '')}`
    req.session.redirectUrl = redirectUrl

    passport.authenticate('steam', (err, user, info) => {
      console.log(err)
      console.log(user)
      console.log(info)
      if (err) {
        return next(err)
      }

      if (!user) {
        return res.redirect(config.url)
      }

      req.logIn(user, err => {
        if (err) {
          return next(err)
        }

        res.redirect(config.url)
      })
    })(req, res, next)
  })

  // GET /auth/loginResponse
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function function will be called,
  //   which, in this example, will redirect the user to the home page.
  // router.get('/loginResponse', passport.authenticate('steam', { failureRedirect: config.app.url, failureFlash: true }), (req, res) => res.redirect(config.app.url))
  router.get('/loginResponse', (req, res, next) => {
    passport.authenticate('steam', (err, user, info) => {

      console.log('1')
      console.log(err)
      console.log(user)
      console.log(info)

      if (err) {
        return next(err)
      }

      if (!user) {
        return res.redirect(config.url)
      }

      req.logIn(user, err => {
        if (err) {
          return next(err)
        }

        res.redirect(req.session.redirectUrl || config.url)

        delete req.session['redirectUrl']
      })
    })(req, res, next)
  })

  router.get('/logout', (req, res) => {
    req.logout()
    res.redirect(config.url)
  })

  return router
}

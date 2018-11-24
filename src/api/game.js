
import { Router } from 'express'
import co from 'co'
import _ from 'underscore'

import towers from '../games/towers'
import colors from '../games/colors'
import jackpot from '../games/jackpot'
import coinflip from '../games/coinflip'

export default () => {
  const router = Router()

  router.use('/towers', towers.router())
  router.use('/colors', colors.router())
  router.use('/jackpot', jackpot.router())
  router.use('/coinflip', coinflip.router())

  return router
}

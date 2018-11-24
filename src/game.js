
import 'babel-polyfill'

import co from 'co'
import minimist from 'minimist'

import { migrateDocuments } from './document'
import logger from './lib/logger'

import { COLORS_GAME, JACKPOT_GAME, RAFFLES_GAME, COINFLIP_GAME } from './games'
import colors from './games/colors'
import jackpot from './games/jackpot'
import raffles from './games/raffles'
import coinflip from './games/coinflip'

const argv = minimist(process.argv.slice(2))

const gamesMap = {
  [COLORS_GAME]: colors,
  [JACKPOT_GAME]: jackpot,
  [RAFFLES_GAME]: raffles,
  [COINFLIP_GAME]: coinflip
}

co(function* () {
  logger.info('CSGOBOSS Game Launcher')

  if(!argv._.length) {
    logger.error('Missing arguments')
    logger.error('game.js [game]')
    return
  }

  const id = parseInt(argv._[0])

  if(typeof gamesMap[id] === 'undefined') {
    logger.error(`Unkown game id: ${id}`)
    return
  }

  const game = gamesMap[id]

  if(typeof game.run === 'undefined') {
    logger.error(`Cannot find worker fn for: ${id}`)
    return
  }

  logger.info(`Starting "${game.name}" worker...`)
  yield co(game.run)
})

.catch(err => {
  logger.error(`startup error: ${err.stack || err}`)
})

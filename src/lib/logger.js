
import config from 'config'
import { Logger, transports } from 'winston'
import winston from 'winston'

export default new Logger({
  transports: [ new transports.Console() ]
})

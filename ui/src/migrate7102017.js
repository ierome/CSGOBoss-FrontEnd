
import 'babel-polyfill'

import co from 'co'

const r = require('rethinkdbdash')({
  "db": "boss",
  "silent": true,
  "servers": [{
    "host": "127.0.0.1",
    "port": 28012
  }]
})

const From = r.table('Players1')
const To = r.table('Players')

co(function* () {
  const players = yield From.forEach(p => {
    return To.insert(p.merge({ id: p('steamid') }).without('tokenHistory', 'tokens', 'personaname', 'steamid'))
  })

  console.log('done')
})

.catch(console.log)

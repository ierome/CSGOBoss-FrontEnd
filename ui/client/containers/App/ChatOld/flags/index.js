
import _ from 'underscore'

const r = require.context('./', false, /\.png$/)

export default _
  .chain(r.keys())
  .map(k => [ k.substring(2, k.length - 4), r(k) ])
  .object()
  .value()

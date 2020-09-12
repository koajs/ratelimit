'use strict'

/**
 * Module dependencies.
 */
const assert = require('assert')

/**
 * MicroTime.
 */

const time = Date.now() * 1e3
const start = process.hrtime()

function getMicrotime () {
  const diff = process.hrtime(start)
  return time + diff[0] * 1e6 + Math.round(diff[1] * 1e-3)
}

/**
 * Expose `Limiter`.
 *
 * Initialize a new limiter with `opts`:
 *
 *  - `id` identifier being limited
 *  - `db` Map object instance (optional). If Map instance is provided, we will use it.
 * This allow user to be able to clear the memory db when required.
 *
 * @param {Object} opts
 * @api public
 */

module.exports = class Limiter {
  constructor ({ id, db, max, duration, namespace = 'limit' }) {
    this.id = id
    assert(this.id, '.id required')
    this.db = db || new Map()
    assert(this.db instanceof Map, 'for memory driver, .db must be Map instance')
    this.max = max
    this.duration = duration
    this.key = `${namespace}:${this.id}`
  }

  async get () {
    const { id, db, duration, key, max } = this

    const entry = db.get(key)
    const now = getMicrotime()
    const reset = now + duration * 1e3
    const expired = entry !== undefined && entry.reset * 1e6 < now
    const hasKey = db.has(key)
    const shouldReInit = !hasKey || expired

    if (shouldReInit) {
      const initState = {
        id,
        reset: reset / 1e6,
        remaining: max,
        total: max
      }
      db.set(key, initState)

      return initState
    } else {
      entry.remaining = entry.remaining > 0 ? entry.remaining - 1 : 0

      return entry
    }
  }
}

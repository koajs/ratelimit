/**
 * Module dependencies.
 */
const assert = require('assert');

const time = Date.now() * 1e3;
const start = process.hrtime();

function getMicrotime() {
  const diff = process.hrtime(start);
  return time + diff[0] * 1e6 + Math.round(diff[1] * 1e-3);
}

/**
 * Expose `Limiter`.
 */

module.exports = Limiter

/**
 * Initialize a new limiter with `opts`:
 *
 *  - `id` identifier being limited
 *  - `db` Map object instance (optional). If Map instance is provided, we will use it.
 * This allow user to be able to clear the memory db when required.
 *
 * @param {Object} opts
 * @api public
 */

function Limiter(opts) {
  this.id = opts.id
  this.db = opts.db || new Map()
  assert(this.id, '.id required')
  assert(this.db instanceof Map, 'for memory driver, .db must be Map instance')
  this.max = opts.max
  this.duration = opts.duration
  this.key = 'limit:' + this.id
}

/**
 * Inspect implementation.
 *
 * @api public
 */

Limiter.prototype.inspect = function () {
  return (
    '<Limiter id=' +
    this.id +
    ', duration=' +
    this.duration +
    ', max=' +
    this.max +
    '>'
  )
}

/**
 * Get values and header / status code and invoke `fn(err, info)`.
 *
 * db is a Map object that has is populated with key
 *  - limit:<id>
 *
 * @param {Function} fn callback function
 * @api public
 */

Limiter.prototype.get = function (fn) {
  const db = this.db;
  const duration = this.duration;
  const key = this.key;
  const max = this.max;

  const entry = db.get(key);
  const now = getMicrotime();
  const reset = now + duration * 1e3;
  const expired = entry !== undefined && entry.reset * 1e6 < now;
  const hasKey = db.has(key);
  const shouldReInit = !hasKey || expired;

  if (shouldReInit) {
    const initState = {
      id: this.id,
      reset: reset / 1e6,
      remaining: max,
      total: max
    }
    db.set(key, initState);
    fn(null, initState);
  } else {
    entry.remaining -= 1;
    fn(null, entry);
  }
}


/**
 * Module dependencies.
 */

var debug = require('debug')('koa-ratelimit');
var Limiter = require('ratelimiter');
var ms = require('ms');
var thenify = require('thenify');

/**
 * Expose `ratelimit()`.
 */

module.exports = ratelimit;

/**
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `db` database connection
 * - `id` id to compare requests [ip]
 * - `headers` custom header names
 *  - `remaining` remaining number of requests ['X-RateLimit-Remaining']
 *  - `reset` reset timestamp ['X-RateLimit-Reset']
 *  - `total` total number of requests ['X-RateLimit-Limit']
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

function ratelimit(opts) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers.remaining = opts.headers.remaining || 'X-RateLimit-Remaining';
  opts.headers.reset = opts.headers.reset || 'X-RateLimit-Reset';
  opts.headers.total = opts.headers.total || 'X-RateLimit-Limit';

  return function *(next){
    var id = opts.id ? opts.id(this) : this.ip;

    if (false === id) return yield* next;

    // initialize limiter
    var limiter = new Limiter({ id: id, __proto__: opts });
    limiter.get = thenify(limiter.get);

    // check limit
    var limit = yield limiter.get();

    // check if current call is legit
    var remaining = limit.remaining > 0 ? limit.remaining - 1 : 0;

    // header fields
    var headers = {};
    headers[opts.headers.remaining] = remaining;
    headers[opts.headers.reset] = limit.reset;
    headers[opts.headers.total] = limit.total;

    this.set(headers);

    debug('remaining %s/%s %s', remaining, limit.total, id);
    if (limit.remaining) return yield* next;

    var delta = (limit.reset * 1000) - Date.now() | 0;
    var after = limit.reset - (Date.now() / 1000) | 0;
    this.set('Retry-After', after);

    this.status = 429;
    this.body = opts.errorMessage || 'Rate limit exceeded, retry in ' + ms(delta, { long: true }) + '.';

    if (opts.throw) {
      this.throw(this.status, this.body, { headers: headers });
    }
  }
}

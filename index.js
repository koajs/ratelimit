
/**
 * Module dependencies.
 */

var debug = require('debug')('koa-ratelimit');
var Limiter = require('ratelimiter');
var thunkify = require('thunkify');
var ms = require('ms');

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
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

function ratelimit(opts) {
  opts = opts || {};

  return function *(next){
    var id = this.ip;

    // initialize limiter
    var limiter = new Limiter({ id: id, __proto__: opts });
    limiter.get = thunkify(limiter.get);

    // check limit
    var limit = yield limiter.get();

    // header fields
    this.set('X-RateLimit-Limit', limit.total);
    this.set('X-RateLimit-Remaining', limit.remaining);
    this.set('X-RateLimit-Reset', limit.reset);


    debug('remaining %s/%s %s', limit.remaining, limit.total, id);
    if (limit.remaining) return yield next;

    var delta = (limit.reset * 1000) - Date.now() | 0;
    var after = limit.reset - (Date.now() / 1000) | 0;
    this.set('Retry-After', after);
    this.status = 429;
    this.body = 'Rate limit exceeded, retry in ' + ms(delta, { long: true });
  }
}

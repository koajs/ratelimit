
/**
 * Module dependencies.
 */

const debug = require('debug')('koa-ratelimit');
const Limiter = require('ratelimiter');
const MemoryLimiter = require('./limiter/memory');
const ms = require('ms');
const defaults = require('lodash.defaults');

/**
 * Expose `ratelimit()`.
 */

module.exports = ratelimit;

/**
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `driver` redis or memory [redis]
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `db` database connection if redis. Map instance if memory
 * - `id` id to compare requests [ip]
 * - `headers` custom header names
 * - `remaining` remaining number of requests ['X-RateLimit-Remaining']
 * - `reset` reset timestamp ['X-RateLimit-Reset']
 * - `total` total number of requests ['X-RateLimit-Limit']
 * - `whitelist` whitelist function [false]
 * - `blacklist` blacklist function [false]
 * - `throw` call ctx.throw if true
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

function ratelimit(opts = {}) {
  const defaultOpts = {
    driver: 'redis',
    duration: 60 * 60 * 1000, // 1 hour
    max: 2500,
    id: ctx => ctx.ip,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-RateLimit-Limit'
    }
  }

  defaults(opts, defaultOpts)

  const {
    remaining = 'X-RateLimit-Remaining',
    reset = 'X-RateLimit-Reset',
    total = 'X-RateLimit-Limit'
  } = opts.headers

  return async function ratelimit(ctx, next) {
    const id = opts.id(ctx)
    const { driver } = opts;
    const whitelisted = typeof opts.whitelist === 'function' ? await opts.whitelist(ctx) : false;
    const blacklisted = typeof opts.blacklist === 'function' ? await opts.blacklist(ctx) : false;

    if (blacklisted) {
      ctx.throw(403, 'Forbidden')
    }

    if (false === id || whitelisted) return await next();

    // initialize limiter
    let limiter
    if (driver === 'memory') {
      limiter = new MemoryLimiter(Object.assign({}, opts, { id }));
    } else if (driver === 'redis') {
      limiter = new Limiter(Object.assign({}, opts, { id }));
    } else {
      throw new Error(`invalid driver. Expecting memory or redis, got ${driver}`)
    }

    // check limit
    const limit = await thenify(limiter.get.bind(limiter));

    // check if current call is legit
    const calls = limit.remaining > 0 ? limit.remaining - 1 : 0;

    // check if header disabled
    const disableHeader = opts.disableHeader || false;

    let headers = {};
    if (!disableHeader) {
      // header fields
      headers = {
        [remaining]: calls,
        [reset]: limit.reset,
        [total]: limit.total
      };

      ctx.set(headers);
    }

    debug('remaining %s/%s %s', remaining, limit.total, id);
    if (limit.remaining) return await next();

    const delta = (limit.reset * 1000) - Date.now() | 0;
    const after = limit.reset - (Date.now() / 1000) | 0;
    ctx.set('Retry-After', after);

    ctx.status = 429;
    ctx.body = opts.errorMessage || `Rate limit exceeded, retry in ${ms(delta, { long: true })}.`;

    if (opts.throw) {
      ctx.throw(ctx.status, ctx.body, { headers });
    }
  }
}

/**
 * Helper function to convert a callback to a Promise.
 */

async function thenify(fn) {
  return await new Promise(function(resolve, reject) {
    function callback(err, res) {
      if (err) return reject(err);
      return resolve(res);
    }

    fn(callback);
  });
}

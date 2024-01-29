'use strict'

/**
 * Module dependencies.
 */

const debug = require('debug')('koa-ratelimit')
const RedisLimiter = require('./limiter/redis')
const MemoryLimiter = require('./limiter/memory')
const ms = require('ms')

/**
 * Expose `ratelimit()`.
 *
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `driver` redis or memory [redis]
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `db` database connection if redis. Map instance if memory
 * - `id` id to compare requests [ip]
 * - `headers` custom header names
 * - `onLimited` callback executed when visitor has been rate limited
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

module.exports = function ratelimit (opts = {}) {
  const defaultOpts = {
    driver: 'redis',
    duration: 60 * 60 * 1000, // 1 hour
    max: 2500,
    id: ctx => ctx.ip,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-RateLimit-Limit'
    },
    onLimit: undefined
  }

  opts = { ...defaultOpts, ...opts }

  const {
    remaining = 'X-RateLimit-Remaining',
    reset = 'X-RateLimit-Reset',
    total = 'X-RateLimit-Limit'
  } = opts.headers

  return async function ratelimit (ctx, next) {
    const id = opts.id(ctx)
    const { driver } = opts
    const whitelisted = typeof opts.whitelist === 'function' && await opts.whitelist(ctx)
    const blacklisted = typeof opts.blacklist === 'function' && await opts.blacklist(ctx)
    const { onLimited } = opts

    if (blacklisted) {
      ctx.throw(403, 'Forbidden')
    }

    if (id === false || whitelisted) return await next()

    // initialize limiter
    let limiter
    if (driver === 'memory') {
      limiter = new MemoryLimiter({ ...opts, id })
    } else if (driver === 'redis') {
      limiter = new RedisLimiter({ ...opts, id })
    } else {
      throw new Error(`invalid driver. Expecting memory or redis, got ${driver}`)
    }

    // check limit
    const limit = await limiter.get()

    // check if current call is legit
    const calls = limit.remaining > 0 ? limit.remaining - 1 : 0

    // check if header disabled
    const disableHeader = opts.disableHeader || false

    let headers = {}
    if (!disableHeader) {
      // header fields
      headers = {
        [remaining]: calls,
        [reset]: limit.reset,
        [total]: limit.total
      }

      ctx.set(headers)
    }

    debug('remaining %s/%s %s', remaining, limit.total, id)
    if (limit.remaining) return await next()

    const delta = (limit.reset * 1000) - Date.now() | 0
    const after = limit.reset - (Date.now() / 1000) | 0
    const message = opts.errorMessage || `Rate limit exceeded, retry in ${ms(delta, { long: true })}.`

    ctx.body = message
    ctx.set('Retry-After', after)
    ctx.state.rateLimit = { after, headers, id, message }
    ctx.status = opts.status || 429

    if (onLimited) onLimited(ctx)

    if (opts.throw) {
      headers['Retry-After'] = after
      ctx.throw(ctx.status, ctx.body, { headers })
    }
  }
}

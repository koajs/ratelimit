
import Debug from 'debug';
import Limiter from 'ratelimiter';
import ms from 'ms';
import promisify from 'es6-promisify';

const debug = new Debug('koa-ratelimit');

/**
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `db` database connection
 * - `id` id to compare requests [ip]
 * - `whitelist` array of ids to whitelist
 * - `blacklist` array of ids to blacklist
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

export default function(opts) {

  opts = opts || {};

  return async function rateLimit(ctx, next) {

    let id = opts.id ? opts.id(ctx) : ctx.ip;

    if (false === id) return await next();

    // whitelist
    if (opts.whitelist && opts.whitelist.includes(id))
      return await next();

    // blacklist
    if (opts.blacklist && opts.blacklist.includes(id))
      return ctx.throw(403);

    // initialize limiter
    let limiter = new Limiter({
      ...opts,
      id: id
    });

    // check limit
    limiter.get = promisify(limiter.get);
    let limit = await limiter.get();

    // check if current call is legit
    let remaining = limit.remaining > 0 ? limit.remaining - 1 : 0;

    // header fields
    ctx.set('X-RateLimit-Limit', limit.total);
    ctx.set('X-RateLimit-Remaining', remaining);
    ctx.set('X-RateLimit-Reset', limit.reset);

    debug('remaining %s/%s %s', remaining, limit.total, id);

    if (limit.remaining) return await next();

    let delta = (limit.reset * 1000) - Date.now() | 0;
    let after = limit.reset - (Date.now() / 1000) | 0;

    // TODO: right now we can't do
    // `ctx.throw(msg, 429)` because we lose the headers
    // and in turn we have these headers checked in our tests, so our tests fail
    // see this issue for more information on this:
    // <https://github.com/koajs/koa/issues/571#issuecomment-172976124>
    ctx.set('Retry-After', after);
    ctx.status = 429;
    ctx.body = `Rate limited exceeded, retry in ${ms(delta, { long: true })}`;

  };

}

const ratelimit = require('./index');

/**
 * Create group-based rate limiter middleware.
 *
 * @param {Object} options
 * @param {Object} options.routeMap - Map of groupName -> rateLimitOptions
 * @param {Function} options.groupBy - Function(ctx) => groupName
 */
module.exports = function (options) {
  const { routeMap = {}, groupBy } = options;

  if (typeof groupBy !== 'function') {
    throw new TypeError('groupBy must be a function');
  }

  // Assign shared db per group if using memory driver
  const sharedDbMap = {};

  for (const [groupName, config] of Object.entries(routeMap)) {
    if (config.driver === 'memory' || !config.driver) {
      sharedDbMap[groupName] = config.db || new Map();
    }
  }

  return async function (ctx, next) {
    try {
      const group = groupBy(ctx);
      const baseOpts = routeMap[group];

      if (!baseOpts) {
        return await next(); // skip rate limiting if group not found
      }

      const groupOpts = {
        driver: 'memory',
        ...baseOpts,
        db: sharedDbMap[group] // reuse persistent in-memory store
      };

      const rateLimitMiddleware = ratelimit(groupOpts);
      return await rateLimitMiddleware(ctx, next);
    } catch (err) {
      console.error('groupLimiter error:', err);
      ctx.throw(500, 'Group limiter internal error');
    }
  };
};

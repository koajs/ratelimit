'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (opts) {

  opts = opts || {};

  return function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(ctx, next) {
      var id, limiter, limit, remaining, delta, after;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              id = opts.id ? opts.id(ctx) : ctx.ip;

              if (!(false === id)) {
                _context.next = 5;
                break;
              }

              _context.next = 4;
              return next();

            case 4:
              return _context.abrupt('return', _context.sent);

            case 5:
              if (!(opts.whitelist && opts.whitelist.includes(id))) {
                _context.next = 9;
                break;
              }

              _context.next = 8;
              return next();

            case 8:
              return _context.abrupt('return', _context.sent);

            case 9:
              if (!(opts.blacklist && opts.blacklist.includes(id))) {
                _context.next = 11;
                break;
              }

              return _context.abrupt('return', ctx.throw(403));

            case 11:

              // initialize limiter
              limiter = new _ratelimiter2.default(_extends({}, opts, {
                id: id
              }));

              // check limit

              limiter.get = (0, _es6Promisify2.default)(limiter.get);
              _context.next = 15;
              return limiter.get();

            case 15:
              limit = _context.sent;

              // check if current call is legit
              remaining = limit.remaining > 0 ? limit.remaining - 1 : 0;

              // header fields

              ctx.set('X-RateLimit-Limit', limit.total);
              ctx.set('X-RateLimit-Remaining', remaining);
              ctx.set('X-RateLimit-Reset', limit.reset);

              debug('remaining %s/%s %s', remaining, limit.total, id);

              if (!limit.remaining) {
                _context.next = 25;
                break;
              }

              _context.next = 24;
              return next();

            case 24:
              return _context.abrupt('return', _context.sent);

            case 25:
              delta = limit.reset * 1000 - Date.now() | 0;
              after = limit.reset - Date.now() / 1000 | 0;

              // TODO: right now we can't do
              // `ctx.throw(msg, 429)` because we lose the headers
              // and in turn we have these headers checked in our tests, so our tests fail
              // see this issue for more information on this:
              // <https://github.com/koajs/koa/issues/571#issuecomment-172976124>

              ctx.set('Retry-After', after);
              ctx.status = 429;
              ctx.body = 'Rate limited exceeded, retry in ' + (0, _ms2.default)(delta, { long: true });

            case 30:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function rateLimit(_x, _x2) {
      return ref.apply(this, arguments);
    };
  }();
};

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _ratelimiter = require('ratelimiter');

var _ratelimiter2 = _interopRequireDefault(_ratelimiter);

var _ms = require('ms');

var _ms2 = _interopRequireDefault(_ms);

var _es6Promisify = require('es6-promisify');

var _es6Promisify2 = _interopRequireDefault(_es6Promisify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } step("next"); }); }; }

var debug = new _debug2.default('koa-ratelimit');

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
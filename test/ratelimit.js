
var request = require('supertest');
var should = require('should');
var redis = require('redis');
var Koa = require('koa');

var ratelimit = require('..');

var db = redis.createClient();

describe('ratelimit middleware', function() {
  var rateLimitDuration = 1000;
  var goodBody = "Num times hit: ";

  before(function(done) {
    db.keys('limit:*', function(err, rows) {
      rows.forEach(db.del, db);
    });

    done();
  });

  describe('limit', function() {
    var guard;
    var app;

    var routeHitOnlyOnce = function() {
      guard.should.be.equal(1);
    };

    beforeEach(function(done) {
      app = new Koa();

      app.use(ratelimit({
        duration: rateLimitDuration,
        db: db,
        max: 1
      }));

      app.use(function (ctx, next) {
        guard++;
        ctx.body = goodBody + guard;
      });

      guard = 0;

      setTimeout(function() {
        request(app.listen())
          .get('/')
          .expect(200, goodBody + "1")
          .expect(routeHitOnlyOnce)
          .end(done);
      }, rateLimitDuration);
    });

    it('responds with 429 when rate limit is exceeded', function(done) {
      request(app.listen())
        .get('/')
        .expect('X-RateLimit-Remaining', 0)
        .expect(429)
        .end(done);
    });

    it('should not yield downstream if ratelimit is exceeded', function(done) {
      request(app.listen())
        .get('/')
        .expect(429)
        .end(function() {
          routeHitOnlyOnce();
          done();
        });
    });
  });

  describe('limit with throw', function() {
    var guard;
    var app;

    var routeHitOnlyOnce = function() {
      guard.should.be.equal(1);
    };

    beforeEach(function(done) {
      app = new Koa();

      app.use(function (ctx, next) {
        try {
          return next();
        } catch (e) {
          ctx.body = e.message;
          ctx.set(e.headers);
        }
      });

      app.use(ratelimit({
        duration: rateLimitDuration,
        db: db,
        max: 1,
        throw: true
      }));

      app.use(function (ctx, next) {
        guard++;
        ctx.body = goodBody + guard;
      });

      guard = 0;

      setTimeout(function() {
        request(app.listen())
          .get('/')
          .expect(200, goodBody + "1")
          .expect(routeHitOnlyOnce)
          .end(done);
      }, rateLimitDuration);
    });

    it('responds with 429 when rate limit is exceeded', function(done) {
      request(app.listen())
        .get('/')
        .expect('X-RateLimit-Remaining', 0)
        .expect(429)
        .end(done);
    });
  });

  describe('id', function (done) {
    it('should allow specifying a custom `id` function', function (done) {
      var app = new Koa();

      app.use(ratelimit({
        db: db,
        max: 1,
        id: function (ctx) {
          return ctx.request.header.foo;
        }
      }));

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(function(res) {
          res.header['x-ratelimit-remaining'].should.equal('0');
        })
        .end(done);
    });

    it('should not limit if `id` returns `false`', function (done) {
      var app = new Koa();

      app.use(ratelimit({
        db: db,
        id: function (ctx) {
          return false;
        },
        max: 5
      }));

      request(app.listen())
        .get('/')
        .expect(function(res) {
          res.header.should.not.have.property('x-ratelimit-remaining');
        })
        .end(done);
    });

    it('should limit using the `id` value', function (done) {
      var app = new Koa();

      app.use(ratelimit({
        db: db,
        max: 1,
        id: function (ctx) {
          return ctx.request.header.foo;
        }
      }));

      app.use(function (ctx, next) {
        ctx.body = ctx.request.header.foo;
      });

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(200, 'bar')
        .end(function() {
          request(app.listen())
            .get('/')
            .set('foo', 'biz')
            .expect(200, 'biz')
            .end(done);
        });
    });
  });

  describe('custom headers', function() {
    it('should allow specifying a custom header names', function(done) {
      var app = new Koa();

      app.use(ratelimit({
        db: db,
        max: 1,
        headers: {
          remaining: 'Rate-Limit-Remaining',
          reset: 'Rate-Limit-Reset',
          total: 'Rate-Limit-Total'
        }
      }));

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(function(res) {
          res.headers.should.containEql('rate-limit-remaining', 'rate-limit-reset', 'rate-limit-total');
          res.headers.should.not.containEql('x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset');
        })
        .end(done);
    });
  });
});

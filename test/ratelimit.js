var koa = require('koa');
var request = require('supertest');
var should = require('should');
var redis = require('redis');

var ratelimit = require('..');

var db = redis.createClient();

describe('ratelimit middleware', function() {
  var rateLimitDuration = 1000;
  var goodBody = "Num times hit: ";
  var guard;
  var app;

  var routeHitOnlyOnce = function() {
    guard.should.be.equal(1);
  };

  beforeEach(function(done) {
    app = koa();

    app.use(ratelimit({
      duration: rateLimitDuration,
      db: db,
      max: 2
    }));

    app.use(function* (next) {
      guard++;
      this.body = goodBody + guard;
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

var koa = require('koa');
var request = require('supertest');
var should = require('should');
var redis = require('redis');

var ratelimit = require('..');

var db = redis.createClient();

describe('ratelimit middleware', function() {
  var app;
  var goodBody = "Num times hit: ";
  var guard;
  var rateLimitDuration = 1000;

  var routeHitOnlyOnce = function() {
    guard.should.be.equal(1);
  };

  beforeEach(function(done) {
    app = koa();

    app.use(ratelimit({
      db: db,
      duration: rateLimitDuration,
      max: 2
    }));

    app.use(function* (next) {
      guard++;
      console.log('guard is ' + guard);
      this.body = goodBody + guard;
    });

    console.log("Setting guard to 0");
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
    console.log("Guard after 200 = " + guard);
    request(app.listen())
      .get('/')
      .expect(429)
      .end(function() {
        console.log("Guard after 429 = " + guard);
        routeHitOnlyOnce();
        done();
      });
  });
});

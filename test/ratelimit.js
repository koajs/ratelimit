
import Koa from 'koa';
import request from 'supertest';
import should from 'should';
import redis from 'redis';

import rateLimit from '../src';

const db = redis.createClient();

describe('rateLimit middleware', () => {

  let rateLimitDuration = 1000;
  let goodBody = 'Num times hit: ';

  before(done => {
    db.keys('limit:*', (err, rows) => {
      if (err) return done(err);
      rows.forEach(db.del, db);
    });
    done();
  });

  describe('limit', () => {

    let guard;
    let app;

    function routeHitOnlyOnce() {
      guard.should.be.equal(1);
    }

    beforeEach(function(done) {

      app = new Koa();

      app.use(rateLimit({
        duration: rateLimitDuration,
        db: db,
        max: 1
      }));

      app.use(ctx => {
        guard++;
        ctx.body = goodBody + guard;
      });

      guard = 0;

      setTimeout(() => {
        request(app.listen())
          .get('/')
          .expect(200, goodBody + '1')
          .expect(routeHitOnlyOnce)
          .end(done);
      }, rateLimitDuration);
    });

    it('responds with 429 when rate limit is exceeded', done => {
      request(app.listen())
        .get('/')
        .expect('X-RateLimit-Remaining', 0)
        .expect(429)
        .end(done);
    });

    it('should not yield downstream if rateLimit is exceeded', done => {
      request(app.listen())
        .get('/')
        .expect(429)
        .end(() => {
          routeHitOnlyOnce();
          done();
        });
    });

  });

  describe('id', done => {

    it('should allow specifying a custom `id` function', done => {

      let app = new Koa();

      app.use(rateLimit({
        db: db,
        max: 1,
        id: ctx => ctx.header.foo
      }));

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect('X-RateLimit-Remaining', '0')
        .end(done);

    });

    it('should not limit if `id` returns `false`', done => {

      let app = new Koa();

      app.use(rateLimit({
        db: db,
        id: ctx => false,
        max: 5
      }));

      request(app.listen())
        .get('/')
        .end((err, res) => {
          if (err) return done(err);
          res.header.should.not.have.property('X-RateLimit-Remaining');
          done();
        });
    });

    it('should limit using the `id` value', done => {

      let app = new Koa();

      app.use(rateLimit({
        db: db,
        max: 1,
        id: ctx => ctx.header.foo
      }));

      app.use(ctx => {
        ctx.body = ctx.header.foo;
      });

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(200, 'bar')
        .end(() => {
          request(app.listen())
            .get('/')
            .set('foo', 'biz')
            .expect(200, 'biz')
            .end(done);
        });

    });

    it('should whitelist using the `id` value', done => {

      let app = new Koa();

      app.use(rateLimit({
        db: db,
        max: 1,
        id: ctx => ctx.header.foo,
        whitelist: [ 'bar' ]
      }));

      app.use(ctx => {
        ctx.body = ctx.header.foo;
      });

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(200, 'bar')
        .end(() => {
          request(app.listen())
            .get('/')
            .set('foo', 'bar')
            .expect(200, 'bar')
            .end(done);
        });

    });

    it('should blacklist using the `id` value', done => {

      let app = new Koa();

      app.use(rateLimit({
        db: db,
        max: 1,
        id: ctx => ctx.header.foo,
        blacklist: 'bar'
      }));

      app.use(ctx => {
        ctx.body = ctx.header.foo;
      });

      request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(200, 'bar')
        .end(() => {
          request(app.listen())
            .get('/')
            .set('foo', 'bar')
            .expect(403)
            .end(done);
        });

    });

  });

});

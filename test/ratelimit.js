
const Koa = require('koa');
const Redis = require('ioredis');
const request = require('supertest');
const should = require('should');

const ratelimit = require('..');
const db = new Redis();

describe('ratelimit middleware', () => {
  const duration = 1000;
  const goodBody = 'Num times hit:';

  beforeEach(async () => await db.eval(`for i, name in ipairs(redis.call('KEYS', 'limit:*')) do redis.call('DEL', name); end`, 0));

  describe('limit', () => {
    let guard;
    let app;

    const hitOnce = () => guard.should.equal(1);

    beforeEach(async () => {
      app = new Koa();

      app.use(ratelimit({ duration, db, max: 1 }));
      app.use(async (ctx) => {
        guard++;
        ctx.body = `${goodBody} ${guard}`;
      });

      guard = 0;

      await sleep(duration);
      await request(app.listen())
        .get('/')
        .expect(200, `${goodBody} 1`)
        .expect(hitOnce)
    });

    it('responds with 429 when rate limit is exceeded', async () => {
      await request(app.listen())
        .get('/')
        .expect('X-RateLimit-Remaining', '0')
        .expect(429);
    });

    it('should not yield downstream if ratelimit is exceeded', async () => {
      await request(app.listen())
        .get('/')
        .expect(429)

      hitOnce();
    });
  });

  describe('limit with throw', () => {
    let guard;
    let app;

    const hitOnce = () => guard.should.equal(1);

    beforeEach(async () => {
      app = new Koa();

      app.use(async (ctx, next) => {
        try {
          await next();
        } catch (e) {
          ctx.body = e.message;
          ctx.set(Object.assign({ 'X-Custom': 'foobar' }, e.headers));
        }
      });

      app.use(ratelimit({
        db,
        duration,
        max: 1,
        throw: true
      }));

      app.use(async (ctx) => {
        guard++;
        ctx.body = `${goodBody} ${guard}`;
      });

      guard = 0;

      await sleep(duration);
      await request(app.listen())
        .get('/')
        .expect(200, `${goodBody} 1`)
        .expect(hitOnce);
    });

    it('responds with 429 when rate limit is exceeded', async () => {
      await request(app.listen())
        .get('/')
        .expect('X-Custom', 'foobar')
        .expect('X-RateLimit-Remaining', '0')
        .expect(429)
    });
  });

  describe('id', async () => {
    it('should allow specifying a custom `id` function', async () => {
      const app = new Koa();

      app.use(ratelimit({
        db,
        id: (ctx) => ctx.request.header.foo,
        max: 1
      }));

      await request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect('X-RateLimit-Remaining', '0');
    });

    it('should not limit if `id` returns `false`', async () => {
      const app = new Koa();

      app.use(ratelimit({
        db,
        id: (ctx) => false,
        max: 5
      }));

      await request(app.listen())
        .get('/')
        .expect((res) => res.header.should.not.have.property('x-ratelimit-remaining'))
    });

    it('should limit using the `id` value', async () => {
      const app = new Koa();

      app.use(ratelimit({
        db,
        id: (ctx) => ctx.request.header.foo,
        max: 1
      }));

      app.use(async (ctx) => {
        ctx.body = ctx.request.header.foo;
      });

      await request(app.listen())
        .get('/')
        .set('foo', 'fiz')
        .expect(200, 'fiz');

      await request(app.listen())
        .get('/')
        .set('foo', 'biz')
        .expect(200, 'biz');
    });
  });

  describe('custom headers', () => {
    it('should allow specifying custom header names', async () => {
      const app = new Koa();

      app.use(ratelimit({
        db,
        headers: {
          remaining: 'Rate-Limit-Remaining',
          reset: 'Rate-Limit-Reset',
          total: 'Rate-Limit-Total'
        },
        max: 1
      }));

      await request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect((res) => {
          res.headers.should.have.keys('rate-limit-remaining', 'rate-limit-reset', 'rate-limit-total');
          res.headers.should.not.have.keys('x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset');
        });
    });
  });

  describe('custom error message', async () => {
    it('should allow specifying a custom error message', async () => {
      const app = new Koa();
      const errorMessage = 'Sometimes You Just Have to Slow Down.';

      app.use(ratelimit({
        db,
        errorMessage,
        max: 1
      }));

      app.use(async (ctx) => {
        ctx.body = 'foo';
      });

      await request(app.listen())
        .get('/')
        .expect(200);

      await request(app.listen())
        .get('/')
        .expect(429)
        .expect(errorMessage);
    });

    it('should return default error message when not specifying', async () => {
      const app = new Koa();

      app.use(ratelimit({
        db,
        max: 1,
      }));

      app.use(async (ctx) => {
        ctx.body = 'foo';
      });

      await request(app.listen())
        .get('/')
        .expect(200)

      await request(app.listen())
        .get('/')
        .set('foo', 'bar')
        .expect(429)
        .expect((res) => res.text.should.match(/Rate limit exceeded, retry in \d+ minutes\./));
    });
  });
});

async function sleep(ms) {
 await new Promise((resolve, reject) => setTimeout(resolve, ms));
}

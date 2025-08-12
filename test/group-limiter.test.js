const Koa = require('koa');
const request = require('supertest');
const groupRateLimit = require('../group-limiter');

// const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

describe('groupRateLimit middleware', () => {
  let app;

  beforeEach(() => {
    app = new Koa();
  });

  it('applies rate limit per group', async () => {
    const middleware = groupRateLimit({
      routeMap: {
        groupA: { duration: 1000, max: 1 },
        groupB: { duration: 1000, max: 2 }
      },
      groupBy: (ctx) => (ctx.path === '/a' ? 'groupA' : 'groupB')
    });

    app.use(middleware);
    app.use((ctx) => {
      ctx.body = 'ok';
    });

    const server = app.callback();

    // Group A - should block 2nd request
    await request(server).get('/a').expect(200);
    await request(server).get('/a').expect(429);

    // Group B - should allow 2 requests
    await request(server).get('/b').expect(200);
    await request(server).get('/b').expect(200);
    await request(server).get('/b').expect(429);
  });

  it('calls next() when no group matches', async () => {
    const middleware = groupRateLimit({
      routeMap: {
        groupA: { duration: 1000, max: 1 }
      },
      groupBy: () => 'nonexistent'
    });

    app.use(middleware);
    app.use((ctx) => {
      ctx.body = 'ok';
    });

    await request(app.callback()).get('/x').expect(200);
  });
});

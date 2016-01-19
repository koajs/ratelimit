
# koa-ratelimit

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![node version][node-image]][node-url]
[![MIT License][license-image]][license-url]

> Rate limiter middleware for koa


# Install

```bash
npm install --save koa-ratelimit
```


# Usage

```js
import ratelimit from 'koa-ratelimit';
import redis from 'redis';
import Koa from 'koa';

const app = new Koa();

// apply rate limit
app.use(ratelimit({
  db: redis.createClient(),
  duration: 60000,
  max: 100,
  id: (ctx) => ctx.ip,
  blacklist: [],
  whitelist: []
}));

// response middleware
app.use(ctx => {
  ctx.body = 'Stuff!';
});

app.listen(3000);
console.log('listening on port 3000');
```

# Options

- `db` redis connection instance
- `max` max requests within `duration` [2500]
- `duration` of limit in milliseconds [3600000]
- `id` id to compare requests [ip]
- `whitelist` array of ids to whitelist
- `blacklist` array of ids to blacklist


# Responses

> Example 200 with header fields:

```log
HTTP/1.1 200 OK
X-Powered-By: koa
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1384377793
Content-Type: text/plain; charset=utf-8
Content-Length: 6
Date: Wed, 13 Nov 2013 21:22:13 GMT
Connection: keep-alive

Stuff!
```

> Example 429 response:

```log
HTTP/1.1 429 Too Many Requests
X-Powered-By: koa
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1384377716
Content-Type: text/plain; charset=utf-8
Content-Length: 39
Retry-After: 7
Date: Wed, 13 Nov 2013 21:21:48 GMT
Connection: keep-alive

Rate limit exceeded, retry in 8 seconds
```


# License

[MIT][license-url]


[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/koa-ratelimit.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-ratelimit
[travis-image]: https://img.shields.io/travis/koajs/ratelimit.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/ratelimit
[node-image]: https://img.shields.io/badge/node.js-%3E=_0.11-red.svg?style=flat-square
[node-url]: http://nodejs.org/download/

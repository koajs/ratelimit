# [**koa-ratelimit**](https://github.com/koajs/ratelimit)

[![build status](https://github.com/koajs/ratelimit/actions/workflows/ci.yml/badge.svg)](https://github.com/koajs/ratelimit/actions/workflows/ci.yml)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/koajs/ratelimit.svg)](LICENSE)

> Rate limiter middleware for koa.


## Table of Contents

* [Installation](#installation)
* [Example](#example)
  * [With a Redis driver](#with-a-redis-driver)
  * [With a memory driver](#with-a-memory-driver)
* [Options](#options)
* [Responses](#responses)
* [License](#license)


## Installation

```sh
npm install koa-ratelimit
```


## Example

### With a Redis driver

```js
const Koa = require('koa');
const ratelimit = require('koa-ratelimit');
const Redis = require('ioredis');
const app = new Koa();

// apply rate limit
app.use(ratelimit({
  driver: 'redis',
  db: new Redis(),
  duration: 60000,
  errorMessage: 'Sometimes You Just Have to Slow Down.',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 100,
  disableHeader: false,
  whitelist: (ctx) => {
    // some logic that returns a boolean
  },
  blacklist: (ctx) => {
    // some logic that returns a boolean
  },
  onLimited: (ctx) => {
    // optional function to run when a user is rate limited
  }
}));

// response middleware
app.use(async (ctx) => {
  ctx.body = 'Stuff!';
});

// run server
app.listen(
  3000,
  () => console.log('listening on port 3000')
);
```

### With a memory driver

```js
const Koa = require('koa');
const ratelimit = require('koa-ratelimit');
const app = new Koa();

// apply rate limit
const db = new Map();

app.use(ratelimit({
  driver: 'memory',
  db: db,
  duration: 60000,
  errorMessage: 'Sometimes You Just Have to Slow Down.',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 100,
  disableHeader: false,
  whitelist: (ctx) => {
    // some logic that returns a boolean
  },
  blacklist: (ctx) => {
    // some logic that returns a boolean
  }
}));

// response middleware
app.use(async (ctx) => {
  ctx.body = 'Stuff!';
});

// run server
app.listen(
  3000,
  () => console.log('listening on port 3000')
);
```


## Options

* `driver` memory or redis \[redis]
* `db` redis connection instance or Map instance (memory)
* `duration` of limit in milliseconds \[3600000]
* `errorMessage` custom error message
* `id` id to compare requests \[ip]
* `namespace` prefix for storage driver key name \[limit]
* `headers` custom header names
* `max` max requests within `duration` \[2500]
* `disableHeader` set whether send the `remaining, reset, total` headers \[false]
* `remaining` remaining number of requests \[`'X-RateLimit-Remaining'`]
* `reset` reset timestamp \[`'X-RateLimit-Reset'`]
* `total` total number of requests \[`'X-RateLimit-Limit'`]
* `whitelist` if function returns true, middleware exits before limiting
* `blacklist` if function returns true, `403` error is thrown
* `throw` call ctx.throw if true


## Responses

Example 200 with header fields:

```sh
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

Example 429 response:

```sh
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


## License

[MIT](LICENSE) © Koa.js contributors

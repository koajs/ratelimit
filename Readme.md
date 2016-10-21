
# koa-ratelimit

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![node version][node-image]][node-url]

[npm-image]: https://img.shields.io/npm/v/koa-ratelimit.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-ratelimit
[travis-image]: https://img.shields.io/travis/koajs/ratelimit.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/ratelimit
[node-image]: https://img.shields.io/badge/node.js-%3E=_0.11-red.svg?style=flat-square
[node-url]: http://nodejs.org/download/

 Rate limiter middleware for koa.

## Installation

```js
$ npm install koa-ratelimit
```

## Example

```js
var ratelimit = require('koa-ratelimit');
var redis = require('redis');
var koa = require('koa');
var app = koa();

// apply rate limit

app.use(ratelimit({
  db: redis.createClient(),
  duration: 60000,
  max: 100,
  id: function (context) {
    return context.ip;
  },
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  errorMessage: 'Sometimes You Just Have to Slow Down.'
}));

// response middleware

app.use(function *(){
  this.body = 'Stuff!';
});

app.listen(3000);
console.log('listening on port 3000');
```

## Options

 - `db` redis connection instance
 - `max` max requests within `duration` [2500]
 - `duration` of limit in milliseconds [3600000]
 - `id` id to compare requests [ip]
 - `headers` custom header names
  - `remaining` remaining number of requests [`'X-RateLimit-Remaining'`]
  - `reset` reset timestamp [`'X-RateLimit-Reset'`]
  - `total` total number of requests [`'X-RateLimit-Limit'`]
 - `errorMessage` custom error message

## Responses

  Example 200 with header fields:

```
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

```
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

  MIT

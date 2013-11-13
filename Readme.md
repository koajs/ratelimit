
# koa-ratelimit

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
  max: 100
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
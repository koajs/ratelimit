
var Koa = require('koa');
var ratelimit = require('./');
var redis = require('ioredis');
var app = new Koa();

// apply rate limit

app.use(ratelimit({
  db: new Redis(),
  duration: 60000,
  max: 100
}));

// response middleware

app.use(async function(ctx) {
  ctx.body = 'Stuff!';
});

app.listen(4000);
console.log('listening on port 4000');


var ratelimit = require('./');
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

app.listen(4000);
console.log('listening on port 4000');

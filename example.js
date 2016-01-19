
import rateLimit from './src';
import redis from 'redis';
import Koa from 'koa';

const app = new Koa();

// apply rate limit
app.use(rateLimit({
  db: redis.createClient(),
  duration: 60000,
  max: 5
}));

// response middleware
app.use(ctx => {
  ctx.body = 'Stuff!';
});

app.listen(4000);
console.log('listening on port 4000');

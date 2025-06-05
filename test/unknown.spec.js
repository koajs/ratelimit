const ratelimit = require('..')
const Koa = require('koa')
const request = require('supertest')

describe('ratelimit middleware with unsupported driver', () => {
  const duration = 1000
  const goodBody = 'Num times hit:'

  describe('middleware with unsupported driver', () => {
    let guard
    let app
    let errorWasThrown

    beforeEach(async () => {
      app = new Koa()
      errorWasThrown = false

      app.use(async (ctx, next) => {
        try {
          await next()
        } catch (e) {
          errorWasThrown = true
          throw e
        }
      })

      app.use(ratelimit({ driver: 'foo', throw: true }))

      app.use(async (ctx) => {
        guard++
        ctx.body = `${goodBody} ${guard}`
      })

      guard = 0

      await sleep(duration)
    })

    it('throws with unsupported driver', async () => {
      await request(app.listen()).get('/').expect(500)

      errorWasThrown.should.equal(true)
    })
  })
})

async function sleep (ms) {
  await new Promise((resolve, reject) => setTimeout(resolve, ms))
}

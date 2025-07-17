import Elysia from 'elysia'

export const profileController = new Elysia({
  prefix: '/profile',
})
  .get('/', async () => {})
  .post('/:id', async ({ params, body }) => {})
  .put('/', async () => {})
  .post('/on-boarding', () => {})

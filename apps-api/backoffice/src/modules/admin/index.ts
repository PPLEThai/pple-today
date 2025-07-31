import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AdminAboutUsController } from './about-us'
import { PollsController } from './poll'

export const AdminController = new Elysia({
  prefix: '/admin',
  adapter: node(),
  tags: ['Admin'],
})
  .use(AdminAboutUsController)
  .use(PollsController)

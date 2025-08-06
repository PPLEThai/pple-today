import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AdminAboutUsController } from './about-us'
import { AdminHashtagController } from './hashtag'
import { AdminPollsController } from './poll'

export const AdminController = new Elysia({
  prefix: '/admin',
  adapter: node(),
  tags: ['Admin'],
})
  .use(AdminAboutUsController)
  .use(AdminPollsController)
  .use(AdminHashtagController)

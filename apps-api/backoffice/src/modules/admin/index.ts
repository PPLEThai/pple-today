import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AdminAboutUsController } from './about-us'
import { AdminPollsController } from './poll'
import { AdminTopicController } from './topic'

export const AdminController = new Elysia({
  prefix: '/admin',
  adapter: node(),
  tags: ['Admin'],
})
  .use(AdminAboutUsController)
  .use(AdminPollsController)
  .use(AdminTopicController)

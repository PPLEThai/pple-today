import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AdminAboutUsController } from './about-us'

export const AdminController = new Elysia({
  prefix: '/admin',
  adapter: node(),
}).use(AdminAboutUsController)

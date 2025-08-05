import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { FacebookController } from './facebook'
import { PollsController } from './polls'
import { PostsController } from './posts'
import { ProfileController } from './profile'

export const ApplicationController = new Elysia({
  adapter: node(),
})
  .use(PostsController)
  .use(AuthController)
  .use(AnnouncementsController)
  .use(ProfileController)
  .use(PollsController)
  .use(FacebookController)

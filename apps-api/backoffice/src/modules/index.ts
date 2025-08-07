import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { FacebookController } from './facebook'
import { FeedController } from './feed'
import { PollsController } from './polls'
import { ProfileController } from './profile'

export const ApplicationController = new Elysia({
  adapter: node(),
})
  .use(FeedController)
  .use(AuthController)
  .use(AnnouncementsController)
  .use(ProfileController)
  .use(PollsController)
  .use(FacebookController)

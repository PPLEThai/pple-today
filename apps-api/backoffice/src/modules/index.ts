import Elysia from 'elysia'

import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { BannerController } from './banner'
import { FacebookController } from './facebook'
import { FeedController } from './feed'
import { PollsController } from './polls'
import { ProfileController } from './profile'

export const ApplicationController = new Elysia()
  .use(FeedController)
  .use(AuthController)
  .use(AnnouncementsController)
  .use(ProfileController)
  .use(PollsController)
  .use(FacebookController)
  .use(BannerController)

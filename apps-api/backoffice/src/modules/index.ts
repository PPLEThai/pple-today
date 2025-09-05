import Elysia from 'elysia'

import { AddressController } from './address'
import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { BannerController } from './banner'
import { FacebookController } from './facebook'
import { FeedController } from './feed'
import { PollsController } from './polls'
import { ProfileController } from './profile'
import { TopicController } from './topic'
import { ElectionController } from './election'

export const ApplicationController = new Elysia()
  .use(FeedController)
  .use(AuthController)
  .use(AnnouncementsController)
  .use(ProfileController)
  .use(PollsController)
  .use(FacebookController)
  .use(BannerController)
  .use(AddressController)
  .use(TopicController)
  .use(ElectionController)

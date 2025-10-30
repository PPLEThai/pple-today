import Elysia from 'elysia'

import { AddressController } from './address'
import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { BannerController } from './banner'
import { ElectionController } from './election'
import { FacebookController } from './facebook'
import { FeedController } from './feed'
import { HashtagController } from './hashtag'
import { MiniAppController } from './mini-app'
import { PollsController } from './polls'
import { ProfileController } from './profile'
import { SearchController } from './search'
import { TopicController } from './topic'

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
  .use(HashtagController)
  .use(SearchController)
  .use(MiniAppController)

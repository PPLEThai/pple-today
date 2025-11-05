import Elysia from 'elysia'

import { AdminAnnouncementsController } from './announcements'
import { AdminAuthController } from './auth'
import { AdminBannerController } from './banner'
import { AdminDashboardController } from './dashboard'
import { AdminElectionController } from './election'
import { AdminFacebookPageController } from './facebook'
import { AdminFeedController } from './feed'
import { AdminFileController } from './file'
import { AdminHashtagController } from './hashtag'
import { AdminMiniAppController } from './mini-app'
import { AdminNotificationController } from './notification'
import { AdminPollsController } from './poll'
import { AdminPostController } from './post'
import { AdminTopicController } from './topic'
import { AdminUserController } from './user'

export const AdminController = new Elysia({
  prefix: '/admin',
})
  .use(AdminAuthController)
  .use(AdminPollsController)
  .use(AdminFileController)
  .use(AdminBannerController)
  .use(AdminAnnouncementsController)
  .use(AdminHashtagController)
  .use(AdminTopicController)
  .use(AdminElectionController)
  .use(AdminFeedController)
  .use(AdminDashboardController)
  .use(AdminPostController)
  .use(AdminMiniAppController)
  .use(AdminFacebookPageController)
  .use(AdminNotificationController)
  .use(AdminUserController)

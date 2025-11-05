import Elysia from 'elysia'

import { AdminAnnouncementsController } from './announcements'
import { AdminAuthController } from './auth'
import { AdminBannerController } from './banner'
import { AdminDashboardController } from './dashboard'
import { AdminElectionController } from './election'
import { AdminFeedController } from './feed'
import { AdminFileController } from './file'
import { AdminHashtagController } from './hashtag'
import { AdminNotificationController } from './notification'
import { AdminPollsController } from './poll'
import { AdminTopicController } from './topic'

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
  .use(AdminNotificationController)

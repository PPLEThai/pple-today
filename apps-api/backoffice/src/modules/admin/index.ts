import Elysia from 'elysia'

import { AdminAboutUsController } from './about-us'
import { AdminAnnouncementsController } from './announcements'
import { AdminCarouselController } from './carousel'
import { AdminFileController } from './file'
import { AdminHashtagController } from './hashtag'
import { AdminPollsController } from './poll'
import { AdminTopicController } from './topic'

export const AdminController = new Elysia({
  prefix: '/admin',
  tags: ['Admin'],
})
  .use(AdminAboutUsController)
  .use(AdminPollsController)
  .use(AdminFileController)
  .use(AdminCarouselController)
  .use(AdminAnnouncementsController)
  .use(AdminHashtagController)
  .use(AdminTopicController)

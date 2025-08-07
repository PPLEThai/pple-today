import Elysia from 'elysia'

import { AnnouncementsController } from './announcements'
import { AuthController } from './auth'
import { FacebookController } from './facebook'
import { PostsController } from './posts'
import { ProfileController } from './profile'

export const ApplicationController = new Elysia()
  .use(PostsController)
  .use(AuthController)
  .use(AnnouncementsController)
  .use(ProfileController)
  .use(FacebookController)

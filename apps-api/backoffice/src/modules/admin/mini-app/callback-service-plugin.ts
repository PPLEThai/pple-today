import Elysia from 'elysia'

import { AdminMiniAppCallbackService } from './callback-service'
import { AdminMiniAppRepositoryPlugin } from './repository'

import { ConfigServicePlugin } from '../../../plugins/config'
import { NotificationCallbackSenderPlugin } from '../../notification/callback-delivery-plugin'

export const AdminMiniAppCallbackServicePlugin = new Elysia({
  name: 'AdminMiniAppCallbackService',
})
  .use([AdminMiniAppRepositoryPlugin, NotificationCallbackSenderPlugin, ConfigServicePlugin])
  .decorate(({ adminMiniAppRepository, notificationCallbackSender, configService }) => ({
    adminMiniAppCallbackService: new AdminMiniAppCallbackService(
      adminMiniAppRepository,
      notificationCallbackSender,
      configService.get('NOTIFICATION_CALLBACK_SECRET_KEY')
    ),
  }))

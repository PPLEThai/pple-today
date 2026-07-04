import Elysia from 'elysia'

import { ZitadelService } from './zitadel-service'

import { ConfigServicePlugin } from '../../../plugins/config'
import { ElysiaLoggerPlugin } from '../../../plugins/log'

export type { ZitadelConfig } from './zitadel-service'
export { ZitadelService } from './zitadel-service'

export const ZitadelServicePlugin = new Elysia({ name: 'ZitadelService' })
  .use([ElysiaLoggerPlugin({ name: 'ZitadelService' }), ConfigServicePlugin])
  .decorate(({ loggerService, configService }) => ({
    zitadelService: new ZitadelService(
      {
        apiUrl: configService.get('ZITADEL_API_URL'),
        pat: configService.get('ZITADEL_PAT'),
        projectId: configService.get('ZITADEL_PROJECT_ID'),
        orgId: configService.get('ZITADEL_ORG_ID'),
        loginV2BaseUri: configService.get('ZITADEL_LOGIN_V2_BASE_URI'),
      },
      loggerService
    ),
  }))

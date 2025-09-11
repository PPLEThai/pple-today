import { BigQueryService } from '@pple-today/api-common/services'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'

export const BigQueryServicePlugin = new Elysia({
  name: 'BigQueryService',
})
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    bigQueryService: new BigQueryService({
      projectId: configService.get('GCP_PROJECT_ID'),
      clientEmail: configService.get('GCP_CLIENT_EMAIL'),
      privateKey: configService.get('GCP_PRIVATE_KEY'),
    }),
  }))

import { BigQuery } from '@google-cloud/bigquery'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'

export class BigQueryClient extends BigQuery {
  constructor(config: { projectId: string; clientEmail: string; privateKey: string }) {
    super({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    })
  }
}

export const BigQueryClientPlugin = new Elysia({
  name: 'BigQueryClient',
})
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    bigQueryClient: new BigQueryClient({
      projectId: configService.get('GCP_PROJECT_ID'),
      clientEmail: configService.get('GCP_CLIENT_EMAIL'),
      privateKey: configService.get('GCP_PRIVATE_KEY'),
    }),
  }))

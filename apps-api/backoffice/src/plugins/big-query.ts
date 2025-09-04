import { BigQuery } from '@google-cloud/bigquery'
import Elysia from 'elysia'

import serverEnv from '../config/env'

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
}).decorate(() => ({
  bigQueryClient: new BigQueryClient({
    projectId: serverEnv.GCP_PROJECT_ID,
    clientEmail: serverEnv.GCP_CLIENT_EMAIL,
    privateKey: serverEnv.GCP_PRIVATE_KEY,
  }),
}))

import { BigQuery } from '@google-cloud/bigquery'

export class BigQueryService extends BigQuery {
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

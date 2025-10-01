import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'

export class KeyManagementService {
  constructor(private config: { projectId: string; clientEmail: string; privateKey: string }) {}
}

export const KeyManagementPlugin = new Elysia({ name: 'KeyManagementPlugin' })
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    keyManagementService: new KeyManagementService({
      clientEmail: configService.get('GCP_CLIENT_EMAIL'),
      privateKey: configService.get('GCP_PRIVATE_KEY'),
      projectId: configService.get('GCP_PROJECT_ID'),
    }),
  }))

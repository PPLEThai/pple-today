import { Treaty, treaty } from '@elysiajs/eden'
import { ElectionKeysStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { AdminApiSchema } from '@api/backoffice/admin'

import { ConfigServicePlugin } from './config'

class BackofficeAdminService {
  private client: Treaty.Create<AdminApiSchema>

  constructor(config: { domain: string }) {
    this.client = treaty<AdminApiSchema>(config.domain)
  }

  async updateElectionKeyStatus(data: {
    electionId: string
    status: ElectionKeysStatus
    encryptKey?: string
    signingKey?: string
  }) {
    const response = await this.client.admin.elections({ electionId: data.electionId }).
  }
}

export const BackofficeAdminServicePlugin = new Elysia({ name: 'BackofficeService' })
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    backofficeService: new BackofficeAdminService({
      domain: configService.get('BACKOFFICE_DOMAIN'),
    }),
  }))

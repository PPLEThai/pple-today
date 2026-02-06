import { FileService } from '@pple-today/api-common/services'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'
import { ElysiaLoggerPlugin } from './log'

export const FileServicePlugin = new Elysia({ name: 'FileService' })
  .use([
    ElysiaLoggerPlugin({
      name: 'FileService',
    }),
    ConfigServicePlugin,
  ])
  .decorate(({ loggerService, configService }) => ({
    fileService: new FileService(
      {
        bucketName: configService.get('GCP_STORAGE_BUCKET_NAME'),
        clientEmail: configService.get('GCP_CLIENT_EMAIL'),
        privateKey: configService.get('GCP_PRIVATE_KEY'),
        projectId: configService.get('GCP_PROJECT_ID'),
      },
      loggerService
    ),
  }))

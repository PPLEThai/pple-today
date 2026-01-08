import { PublicFilePath } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { FileService } from '@pple-today/api-common/services'
import Elysia from 'elysia'

import { GetOptimizedImageUrlQuery } from './models'

import { ConfigServicePlugin } from '../../plugins/config'
import { FileServicePlugin } from '../../plugins/file'
import { ElysiaLoggerPlugin } from '../../plugins/log'

export class FileServerService {
  private readonly ALLOW_IMAGE_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.avif',
    '.gif',
    '.tiff',
    '.bmp',
  ]

  constructor(
    private readonly config: {
      imageServerBaseUrl: string
      apiBaseUrl: string
    },
    private readonly loggerService: ElysiaLoggerInstance,
    private readonly fileService: FileService
  ) {}

  getOptimizedFileUrl(filePath: PublicFilePath, config: GetOptimizedImageUrlQuery) {
    const publicFileUrl = this.fileService.getPublicFileUrl(filePath)

    if (!this.ALLOW_IMAGE_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext))) {
      this.loggerService.warn(
        `File extension not supported for optimization: ${filePath}, returning original file URL`
      )
      return publicFileUrl
    }

    if (!this.config.imageServerBaseUrl) {
      this.loggerService.warn(
        'Image server base URL is not configured, returning original file URL'
      )
      return publicFileUrl
    }

    if ((!config.width && !config.height) || !config.quality) {
      return publicFileUrl
    }

    const url = new URL(this.config.imageServerBaseUrl)

    if (config.width && config.width > 0) url.pathname += `/w:${config.width}`
    if (config.height && config.height > 0) url.pathname += `/h:${config.height}`

    url.pathname += `/q:${config.quality}`
    url.pathname += `/plain/${publicFileUrl}`

    return url.toString()
  }

  getFileEndpointUrl(path: string) {
    const url = new URL(this.config.apiBaseUrl)
    url.pathname = `/files/${path}`

    return url.toString()
  }

  bulkGetFileEndpointUrl(paths: string[]) {
    return paths.map((path) => this.getFileEndpointUrl(path))
  }
}

export const FileServerServicePlugin = new Elysia({ name: 'FileServerServicePlugin' })
  .use([
    FileServicePlugin,
    ConfigServicePlugin,
    ElysiaLoggerPlugin({
      name: 'FileServerServiceLogger',
    }),
  ])
  .decorate(({ fileService, configService, loggerService }) => ({
    fileServerService: new FileServerService(
      {
        imageServerBaseUrl: configService.get('IMAGE_SERVER_BASE_URL'),
        apiBaseUrl: configService.get('API_BASE_URL'),
      },
      loggerService,
      fileService
    ),
  }))

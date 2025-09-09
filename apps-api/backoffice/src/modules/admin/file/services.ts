import { createId } from '@paralleldrive/cuid2'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, exhaustiveGuard } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetUploadSignedUrlBody, UploadFileCategory } from './models'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminFileService {
  constructor(private readonly fileService: FileService) {}

  async getUploadSignedUrl(body: GetUploadSignedUrlBody) {
    let filePath: FilePath
    let fileContentType: string

    const randomId = createId()

    switch (body.category) {
      case UploadFileCategory.BANNER:
        filePath = `${this.fileService.prefixTempFolder}banner/banner-${randomId}.png`
        fileContentType = 'image/png'
        break
      case UploadFileCategory.ANNOUNCEMENT:
        filePath = `${this.fileService.prefixTempFolder}announcement/announcement-${randomId}.pdf`
        fileContentType = 'application/pdf'
        break
      case UploadFileCategory.TOPIC:
        filePath = `${this.fileService.prefixTempFolder}topic/topic-${randomId}.png`
        fileContentType = 'image/png'
        break
      case UploadFileCategory.PROFILE_IMAGE:
        filePath = `${this.fileService.prefixPublicFolder}users/profile-image-${body.id}.png`
        fileContentType = 'image/png'
        break
      default:
        exhaustiveGuard(body)
    }

    const getResult = await this.fileService.getUploadSignedUrl(filePath, {
      contentType: fileContentType,
    })

    if (getResult.isErr()) {
      return err(getResult.error)
    }

    return ok({
      filePath: filePath as FilePath,
      uploadUrl: getResult.value.url,
      uploadFields: getResult.value.fields,
    })
  }
}

export const AdminFileServicePlugin = new Elysia({ name: 'AdminFileService' })
  .use([FileServicePlugin])
  .decorate(({ fileService }) => ({
    fileService: new AdminFileService(fileService),
  }))

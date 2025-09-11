import { createId } from '@paralleldrive/cuid2'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, exhaustiveGuard } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateUploadSignedUrlBody, UploadFileCategory } from './models'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminFileService {
  constructor(private readonly fileService: FileService) {}

  async createUploadSignedUrl(body: CreateUploadSignedUrlBody) {
    let filePathWithoutExt: FilePath

    const randomId = createId()

    switch (body.category) {
      case UploadFileCategory.BANNER:
        filePathWithoutExt =
          `${this.fileService.prefixTempFolder}banner/banner-${randomId}` as FilePath
        break
      case UploadFileCategory.ANNOUNCEMENT:
        filePathWithoutExt =
          `${this.fileService.prefixTempFolder}announcement/announcement-${randomId}` as FilePath
        break
      case UploadFileCategory.TOPIC:
        filePathWithoutExt =
          `${this.fileService.prefixTempFolder}topic/topic-${randomId}` as FilePath
        break
      case UploadFileCategory.PROFILE_IMAGE:
        filePathWithoutExt =
          `${this.fileService.prefixTempFolder}users/profile-image-${body.id}` as FilePath
        break
      default:
        exhaustiveGuard(body)
    }

    const filePath = this.fileService.getFilePathFromMimeType(filePathWithoutExt, body.contentType)
    if (filePath.isErr()) return err(filePath.error)

    const getResult = await this.fileService.createUploadSignedUrl(filePath.value, {
      contentType: body.contentType,
    })

    if (getResult.isErr()) {
      return err(getResult.error)
    }

    return ok({
      filePath: filePath.value,
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

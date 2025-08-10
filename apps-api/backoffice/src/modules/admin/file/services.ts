import { createId } from '@paralleldrive/cuid2'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetUploadSignedUrlBody, UploadFileCategory } from './models'

import { err, exhaustiveGuard } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminFileService {
  constructor(private readonly fileService: FileService) {}

  async getUploadSignedUrl(body: GetUploadSignedUrlBody) {
    let filePath: string
    const randomId = createId()

    switch (body.category) {
      case UploadFileCategory.ANNOUNCEMENT:
        filePath = `${this.fileService.prefixTempFolder}announcement/${randomId}.pdf`
        break
      case UploadFileCategory.TOPIC:
        filePath = `${this.fileService.prefixTempFolder}topic/${randomId}.png`
        break
      case UploadFileCategory.PROFILE_IMAGE:
        filePath = `${this.fileService.prefixPublicFolder}users/profile-image-${body.id}.png`
        break
      default:
        exhaustiveGuard(body)
    }

    const getResult = await this.fileService.getUploadSignedUrl(filePath)

    if (getResult.isErr()) {
      return err(getResult.error)
    }

    return ok({
      filePath,
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

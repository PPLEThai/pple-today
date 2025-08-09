import { randomUUID } from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { UploadFileCategory } from './models'

import { err, exhaustiveGuard } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminFileService {
  constructor(private readonly fileService: FileService) {}

  async getUploadSignedUrl(category: UploadFileCategory, resourceId: string) {
    let filePath
    const randomId = randomUUID()

    switch (category) {
      case UploadFileCategory.ANNOUNCEMENT:
        filePath = `announcement/${resourceId}-${randomId}.pdf`
        break
      case UploadFileCategory.TOPIC:
        filePath = `topic/${resourceId}-${randomUUID()}.png`
        break
      case UploadFileCategory.PROFILE_IMAGE:
        filePath = `users/profile-image-${resourceId}.png`
        break
      default:
        exhaustiveGuard(category)
    }

    const getResult = await this.fileService.getUploadSignedUrl(filePath)

    if (getResult.isErr()) {
      return err(getResult.error)
    }

    return ok({
      filePath,
      uploadUrl: getResult.value,
    })
  }
}

export const AdminFileServicePlugin = new Elysia({ name: 'AdminFileService' })
  .use([FileServicePlugin])
  .decorate(({ fileService }) => ({
    fileService: new AdminFileService(fileService),
  }))

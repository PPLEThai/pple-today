import {
  GenerateSignedPostPolicyV4Options,
  GetSignedUrlConfig,
  Storage,
} from '@google-cloud/storage'
import Elysia from 'elysia'
import https from 'https'
import { Err, fromPromise, Ok, ok } from 'neverthrow'
import { Readable } from 'stream'

import { FilePermission, FileTransactionEntry } from './types'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import { FilePath } from '../../dtos/file'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '../../plugins/logger'
import {
  ApiErrorResponse,
  err,
  exhaustiveGuard,
  OnlyErr,
  throwWithReturnType,
  WithoutErr,
} from '../../utils/error'

export class FileService {
  public prefixPublicFolder = 'public/' as const
  public prefixPrivateFolder = 'private/' as const
  public prefixDeletedFolder = 'deleted/' as const
  public prefixTempFolder = 'temp/' as const

  private storage: Storage
  private bucket: ReturnType<Storage['bucket']>

  constructor(
    config: {
      projectId: string
      bucketName: string
      clientEmail: string
      privateKey: string
    },
    public readonly loggerService: ElysiaLoggerInstance
  ) {
    this.storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    })
    this.bucket = this.storage.bucket(config.bucketName)
  }

  private async moveFileAndPermission(file: string, prefix: string, shareType: FilePermission) {
    const newPath = `${prefix}${this.getFilePath(file)}`
    const moveResult = await this.moveFile(file, newPath)

    if (moveResult.isErr()) {
      return err(moveResult.error)
    }

    let updatePermissionResult

    switch (shareType) {
      case FilePermission.PUBLIC:
        updatePermissionResult = await this.markAsPublic(newPath)
        break
      case FilePermission.PRIVATE:
        updatePermissionResult = await this.markAsPrivate(newPath)
        break
      default:
        exhaustiveGuard(shareType)
    }

    if (updatePermissionResult.isErr()) {
      const revertPosition = await this.moveFile(newPath, file)
      if (revertPosition.isErr()) return err(revertPosition.error)

      return err(updatePermissionResult.error)
    }

    return ok(newPath)
  }

  private async bulkMoveToFolder(files: string[], prefix: string, permission: FilePermission) {
    const moveResults = await Promise.all(
      files.map(async (file) => {
        if (file.startsWith(prefix)) return ok(file)
        return await this.moveFileAndPermission(file, prefix, permission)
      })
    )

    if (moveResults.some((result) => result.isErr())) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    return ok((moveResults as Array<Ok<string, never>>).map((result) => result.value))
  }

  getFilePath(fullPath: string) {
    return fullPath.split('/')[0]
  }

  async markAsPublic(file: string) {
    return await fromPromise(this.bucket.file(file).makePublic(), (err) => ({
      code: InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
      message: err instanceof Error ? err.message : '',
    }))
  }

  async markAsPrivate(file: string) {
    return await fromPromise(this.bucket.file(file).makePrivate(), (err) => ({
      code: InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
      message: err instanceof Error ? err.message : '',
    }))
  }

  async bulkMoveToPrivateFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixPrivateFolder, FilePermission.PRIVATE)
  }

  async bulkDeleteFile(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixDeletedFolder, FilePermission.PRIVATE)
  }

  async bulkMoveToPublicFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixPublicFolder, FilePermission.PUBLIC)
  }

  async getUploadSignedUrl(
    fileKey: string,
    config?: {
      expiresIn?: number
      maxSize?: number
      contentType?: string
    }
  ) {
    const expiresIn = config?.expiresIn ?? 15 * 60
    const maxSize = config?.maxSize ?? 4 * 1024 * 1024
    const contentType = config?.contentType ?? 'application/octet-stream'

    const options: GenerateSignedPostPolicyV4Options = {
      expires: Date.now() + expiresIn * 1000,
      fields: {
        'Content-Type': contentType,
      },
      conditions: [
        ['content-length-range', 0, maxSize],
        ['eq', '$Content-Type', contentType],
      ],
    }

    return fromPromise(
      this.bucket
        .file(fileKey)
        .generateSignedPostPolicyV4(options)
        .then((file) => file[0]),
      (err) => ({
        code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
        message: (err as Error).message,
      })
    )
  }

  async moveFile(srcFile: string, destFile: string) {
    return fromPromise(this.bucket.file(srcFile).move(this.bucket.file(destFile)), (err) => ({
      code: InternalErrorCode.FILE_MOVE_ERROR,
      message: (err as Error).message,
    }))
  }

  async bulkGetFileSignedUrl(
    fileKeys: string[],
    config: {
      expiresIn: number
    } = { expiresIn: 3600 }
  ) {
    const signedUrls = await Promise.all(
      fileKeys.map((fileKey) => this.getFileSignedUrl(fileKey, config))
    )

    const signedUrlWithError = signedUrls.filter((result) => result.isErr())

    if (signedUrlWithError.length > 0) {
      return err({
        code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
        message: 'Failed to create signed URLs',
      })
    }

    return ok(signedUrls.map((result) => (result.isOk() ? result.value : '')))
  }

  async getFileSignedUrl(
    fileKey: string,
    config: {
      expiresIn: number
    } = { expiresIn: 3600 }
  ) {
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + config.expiresIn * 1000,
    }

    return fromPromise(
      this.bucket
        .file(fileKey)
        .getSignedUrl(options)
        .then((file) => file[0]),
      (err) => ({
        code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
        message: (err as Error).message,
      })
    )
  }

  bulkGetPublicFileUrl(fileKeys: string[]) {
    return fileKeys.map((fileKey) => this.getPublicFileUrl(fileKey))
  }

  getPublicFileUrl(fileKey: string) {
    return decodeURIComponent(this.bucket.file(fileKey).publicUrl())
  }

  async uploadProfilePagePicture(url: string, pageId: string) {
    const destination = `public/pages/profile-picture-${pageId}.jpg`
    const result = await this.uploadFileFromUrl(url, destination)

    if (result.isErr()) {
      return result
    }

    const markAsPublicResult = await this.markAsPublic(destination)
    if (markAsPublicResult.isErr()) {
      return markAsPublicResult
    }

    return ok(destination)
  }

  async deleteFile(fileKey: string) {
    return fromPromise(this.bucket.file(fileKey).delete(), (err) => ({
      code: InternalErrorCode.FILE_DELETE_ERROR,
      message: (err as Error).message,
    }))
  }

  async uploadFile(destination: string, file: File) {
    return fromPromise(
      new Promise<string>((resolve, reject) => {
        const writeStream = this.bucket.file(destination).createWriteStream({
          resumable: false,
          contentType: file.type,
        })

        // NOTE: I'm not sure why but the file.stream() is not compatible with Readable.fromWeb
        const readableStream = Readable.fromWeb(file.stream() as any)
        readableStream.pipe(writeStream)

        writeStream.on('finish', () => {
          resolve(`File uploaded successfully to ${destination}`)
        })
        writeStream.on('error', (err) => {
          reject(new Error(`Error uploading file to ${destination}: ${err.message}`))
        })
      }),
      (err) => ({
        code: InternalErrorCode.FILE_UPLOAD_ERROR,
        message: (err as Error).message,
      })
    )
  }

  /**
   * ## Warning
   * - Please take very good care of the URL you are passing here. because it might lead to SSRF attacks if the URL is not properly validated.
   */
  async uploadFileFromUrl(url: string, destination: string) {
    return fromPromise(
      new Promise<string>((resolve, reject) => {
        https
          .get(url, async (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to fetch file from ${url}`))
              return
            }

            const file = this.bucket.file(destination)
            const writeStream = file.createWriteStream({
              resumable: false,
              contentType: response.headers['content-type'],
            })

            response.pipe(writeStream)

            writeStream.on('finish', () => {
              resolve(`File uploaded successfully to ${destination}`)
            })
            writeStream.on('error', (err) => {
              reject(new Error(`Error uploading file to ${destination}: ${err.message}`))
            })
          })
          .on('error', (err) => {
            reject(new Error(`Error fetching file from ${url}: ${err.message}`))
          })
      }),
      (err) => ({
        code: InternalErrorCode.FILE_UPLOAD_ERROR,
        message: (err as Error).message,
      })
    )
  }

  /**
   * ### Note
   * This method allows you to execute a series of file operations within a transaction.
   * Please ignore type `Err` from return type because it will be served as error instead
   * @param cb Callback function to execute within the transaction
   * @returns [result, fileTransaction]
   */
  $transaction = async <T>(
    cb: (tx: FileTransactionService) => Promise<T>
  ): Promise<
    | [WithoutErr<T>, FileTransactionService]
    | OnlyErr<T>
    | Err<never, ApiErrorResponse<typeof InternalErrorCode.FILE_ROLLBACK_FAILED>>
  > => {
    const fileTransaction = new FileTransactionService(this)

    try {
      return [await cb(fileTransaction), fileTransaction] as any
    } catch (err) {
      const rollbackResult = await fileTransaction.rollback()
      if (rollbackResult.isErr()) return throwWithReturnType(rollbackResult) as any
      throw err
    }
  }
}

export class FileTransactionService {
  private transaction: FileTransactionEntry[] = []
  constructor(private readonly fileService: FileService) {}

  private async moveFile(fileKey: string, to: string) {
    const result = await this.fileService.moveFile(fileKey, to)

    if (result.isErr()) {
      return err(result.error)
    }

    this.transaction.push({
      action: 'MOVE',
      from: fileKey,
      to,
    })

    return ok(fileKey)
  }

  private async changePermission(
    oldFileKey: FilePath,
    newFileKey: FilePath,
    permission: FilePermission
  ) {
    const beforePermission = oldFileKey.startsWith(this.fileService.prefixPublicFolder)
      ? FilePermission.PUBLIC
      : FilePermission.PRIVATE

    if (beforePermission === permission) return ok(newFileKey)

    let result
    if (permission === FilePermission.PUBLIC)
      result = await this.fileService.markAsPublic(newFileKey)
    else result = await this.fileService.markAsPrivate(newFileKey)

    if (result.isErr()) {
      return err(result.error)
    }

    const transactionEntry: FileTransactionEntry = {
      action: 'PERMISSION',
      target: newFileKey,
      before: beforePermission,
      after: permission,
    }

    this.transaction.push(transactionEntry)
    return ok(newFileKey)
  }

  private async bulkMoveToFolder(fileKeys: FilePath[], prefixFolder: string) {
    const newFileKeys: FilePath[] = []
    for (const fileKey of fileKeys) {
      if (fileKey.startsWith(prefixFolder)) continue

      const newFileKey = (prefixFolder + this.fileService.getFilePath(fileKey)) as FilePath
      const result = await this.moveFile(fileKey, newFileKey)

      if (result.isErr()) {
        return err(result.error)
      }

      const changePermissionResult = await this.changePermission(
        fileKey,
        newFileKey,
        prefixFolder === this.fileService.prefixPublicFolder
          ? FilePermission.PUBLIC
          : FilePermission.PRIVATE
      )

      if (changePermissionResult.isErr()) {
        return err(changePermissionResult.error)
      }

      newFileKeys.push(newFileKey)
    }

    return ok(newFileKeys)
  }

  async uploadFile(fileKey: FilePath, file: File) {
    const uploadResult = await this.fileService.uploadFile(fileKey, file)

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    this.transaction.push({
      target: fileKey,
      action: 'UPLOAD',
    })

    return ok(fileKey)
  }

  async uploadFileFromUrl(url: string, fileKey: FilePath) {
    const uploadResult = await this.fileService.uploadFileFromUrl(url, fileKey)

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    this.transaction.push({
      target: fileKey,
      action: 'UPLOAD',
    })

    return ok(fileKey)
  }

  async bulkMoveToPublicFolder(fileKeys: FilePath[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixPublicFolder)
  }

  async bulkMoveToPrivateFolder(fileKeys: FilePath[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixPrivateFolder)
  }

  async bulkRemoveFile(fileKeys: FilePath[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixDeletedFolder)
  }

  async removeFile(fileKey: FilePath) {
    return await this.bulkRemoveFile([fileKey])
  }

  async rollback() {
    while (true) {
      const entry = this.transaction.pop()
      if (!entry) break

      this.fileService.loggerService.warn({
        message: `Rolling back file operation: ${entry.action}`,
        context: {
          entry,
        },
      })

      let result
      switch (entry.action) {
        case 'PERMISSION':
          if (entry.before === entry.after) continue

          if (entry.before === FilePermission.PUBLIC)
            result = await this.fileService.markAsPublic(entry.target)
          else result = await this.fileService.markAsPrivate(entry.target)

          if (result.isErr()) {
            this.transaction.push(entry)
            return err({
              code: InternalErrorCode.FILE_ROLLBACK_FAILED,
              message: `Failed to change file permission for ${entry.target} during rollback`,
            })
          }

          break
        case 'MOVE':
          if (entry.to === entry.from) continue
          result = await this.fileService.moveFile(entry.to, entry.from)

          if (result.isErr()) {
            this.transaction.push(entry)
            return err({
              code: InternalErrorCode.FILE_ROLLBACK_FAILED,
              message: `Failed to move file ${entry.from} during rollback`,
            })
          }

          break
        case 'UPLOAD':
          result = await this.fileService.deleteFile(entry.target)

          if (result.isErr()) {
            this.transaction.push(entry)
            return err({
              code: InternalErrorCode.FILE_ROLLBACK_FAILED,
              message: `Failed to delete file ${entry.target} during rollback`,
            })
          }

          break
        default:
          exhaustiveGuard(entry)
      }
    }

    return ok()
  }
}

export const FileServicePlugin = new Elysia({
  name: 'FileService',
})
  .use(ElysiaLoggerPlugin({ name: 'FileService' }))
  .decorate(({ loggerService }) => ({
    fileService: new FileService(
      {
        projectId: serverEnv.GCP_PROJECT_ID,
        clientEmail: serverEnv.GCP_CLIENT_EMAIL,
        privateKey: serverEnv.GCP_PRIVATE_KEY,
        bucketName: serverEnv.GCP_STORAGE_BUCKET_NAME,
      },
      loggerService
    ),
  }))

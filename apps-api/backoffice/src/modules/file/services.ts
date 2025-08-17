import {
  GenerateSignedPostPolicyV4Options,
  GetSignedUrlConfig,
  Storage,
} from '@google-cloud/storage'
import Elysia from 'elysia'
import https from 'https'
import { fromPromise, Ok, ok } from 'neverthrow'
import { Readable } from 'stream'

import { FilePermission, FileTransactionEntry } from './types'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import { err, exhaustiveGuard } from '../../utils/error'

export class FileService {
  public prefixPublicFolder = 'public/' as const
  public prefixPrivateFolder = 'private/' as const
  public prefixTempFolder = 'temp/' as const

  private storage: Storage
  private bucket: ReturnType<Storage['bucket']>

  constructor(config: {
    projectId: string
    bucketName: string
    clientEmail: string
    privateKey: string
  }) {
    this.storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    })
    this.bucket = this.storage.bucket(config.bucketName)
  }

  private async moveFileAndPermission(
    file: string,
    prefix: string,
    shareType: 'PUBLIC' | 'PRIVATE'
  ) {
    const newPath = `${prefix}${this.getFilePath(file)}`
    const realAttachment = await this.moveFile(file, newPath)

    if (realAttachment.isErr()) {
      return err(realAttachment.error)
    }

    let editShareTypeResult

    if (shareType === FilePermission.PUBLIC) editShareTypeResult = await this.markAsPublic(newPath)
    else editShareTypeResult = await this.markAsPrivate(newPath)

    if (editShareTypeResult.isErr()) {
      const revertPosition = await this.moveFile(newPath, file)
      if (revertPosition.isErr()) return err(revertPosition.error)

      return err(editShareTypeResult.error)
    }

    return ok(newPath)
  }

  private async bulkMoveToFolder(files: string[], prefix: string, permission: FilePermission) {
    const moveResults = await Promise.all(
      files.map(async (file) => {
        if (file.startsWith(prefix)) return ok(file)

        const moveResult = await this.moveFileAndPermission(file, prefix, permission)
        if (moveResult.isErr()) return err(moveResult.error)

        return ok(moveResult.value)
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
    if (fullPath.startsWith(this.prefixPublicFolder)) {
      return fullPath.slice(this.prefixPublicFolder.length)
    } else if (fullPath.startsWith(this.prefixPrivateFolder)) {
      return fullPath.slice(this.prefixPrivateFolder.length)
    } else if (fullPath.startsWith(this.prefixTempFolder)) {
      return fullPath.slice(this.prefixTempFolder.length)
    }
    return fullPath
  }

  async markAsPublic(file: string) {
    const results = await fromPromise(this.bucket.file(file).makePublic(), (err) => ({
      code: InternalErrorCode.FILE_MOVE_ERROR,
      message: (err as Error).message,
    }))

    if (results.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    return ok(file)
  }

  async markAsPrivate(file: string) {
    const results = await fromPromise(this.bucket.file(file).makePrivate(), (err) => ({
      code: InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
      message: (err as Error).message,
    }))

    if (results.isErr()) {
      return err({
        code: InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    return ok(file)
  }

  async bulkMoveToTempFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixTempFolder, FilePermission.PRIVATE)
  }

  async bulkMoveToPrivateFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixPrivateFolder, FilePermission.PRIVATE)
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

    const markAsPublicResult = await this.bulkMarkAsPublic([destination])
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

  $transaction = async <T>(cb: (tx: FileTransactionService) => Promise<T>) => {
    const fileTransaction = new FileTransactionService(this)

    try {
      return await cb(fileTransaction)
    } catch (err) {
      await fileTransaction.rollback()
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
      target: fileKey,
      action: {
        type: 'MOVE',
        to,
      },
    })

    return ok(fileKey)
  }

  private async changePermission(fileKey: string, permission: FilePermission) {
    const beforePermission = fileKey.startsWith(this.fileService.prefixPublicFolder)
      ? FilePermission.PUBLIC
      : FilePermission.PRIVATE

    if (beforePermission === permission) return ok(fileKey)

    const transactionEntry: FileTransactionEntry = {
      target: fileKey,
      action: {
        type: 'PERMISSION',
        permission: {
          before: beforePermission,
          after: permission,
        },
      },
    }

    let result
    if (permission === FilePermission.PUBLIC) result = await this.fileService.markAsPublic(fileKey)
    else result = await this.fileService.markAsPrivate(fileKey)

    if (result.isErr()) {
      return err(result.error)
    }

    this.transaction.push(transactionEntry)
    return ok(fileKey)
  }

  private async bulkMoveToFolder(fileKeys: string[], prefixFolder: string) {
    const newFileKeys: string[] = []
    for (const fileKey of fileKeys) {
      if (fileKey.startsWith(prefixFolder)) continue

      const newFileKey = prefixFolder + this.fileService.getFilePath(fileKey)
      const result = await this.moveFile(fileKey, newFileKey)

      if (result.isErr()) {
        return err(result.error)
      }

      const changePermissionResult = await this.changePermission(
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

  async uploadFile(fileKey: string, file: File) {
    const uploadResult = await this.fileService.uploadFile(fileKey, file)

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    this.transaction.push({
      target: fileKey,
      action: {
        type: 'UPLOAD',
      },
    })

    return ok(fileKey)
  }

  async uploadFileFromUrl(url: string, fileKey: string) {
    const uploadResult = await this.fileService.uploadFileFromUrl(url, fileKey)

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    this.transaction.push({
      target: fileKey,
      action: {
        type: 'UPLOAD',
      },
    })

    const changePermissionResult = await this.changePermission(
      fileKey,
      fileKey.startsWith(this.fileService.prefixPublicFolder)
        ? FilePermission.PUBLIC
        : FilePermission.PRIVATE
    )

    if (changePermissionResult.isErr()) {
      return err(changePermissionResult.error)
    }

    return ok(fileKey)
  }

  async bulkMoveToPublicFolder(fileKeys: string[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixPublicFolder)
  }

  async bulkMoveToPrivateFolder(fileKeys: string[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixPrivateFolder)
  }

  async bulkMoveToTempFolder(fileKeys: string[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixTempFolder)
  }

  async bulkDeleteFile(fileKeys: string[]) {
    return await this.bulkMoveToTempFolder(fileKeys)
  }

  async deleteFile(fileKey: string) {
    return await this.fileService.bulkMoveToTempFolder([fileKey])
  }

  async rollback() {
    for (const entry of this.transaction.reverse()) {
      let result
      switch (entry.action.type) {
        case 'PERMISSION':
          if (entry.action.permission.before === entry.action.permission.after) continue

          if (entry.action.permission.before === FilePermission.PUBLIC)
            result = await this.fileService.markAsPublic(entry.target)
          else result = await this.fileService.markAsPrivate(entry.target)

          if (result.isErr()) {
            return err(result.error)
          }

          break
        case 'MOVE':
          result = await this.fileService.moveFile(entry.action.to, entry.target)

          if (result.isErr()) {
            return err(result.error)
          }

          break
        case 'UPLOAD':
          result = await this.fileService.deleteFile(entry.target)

          if (result.isErr()) {
            return err(result.error)
          }

          break
        default:
          exhaustiveGuard(entry.action)
      }
    }
  }
}

export const FileServicePlugin = new Elysia({
  name: 'FileService',
}).decorate(() => ({
  fileService: new FileService({
    projectId: serverEnv.GCP_PROJECT_ID,
    clientEmail: serverEnv.GCP_CLIENT_EMAIL,
    privateKey: serverEnv.GCP_PRIVATE_KEY,
    bucketName: serverEnv.GCP_STORAGE_BUCKET_NAME,
  }),
}))

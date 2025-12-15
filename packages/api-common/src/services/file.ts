import {
  DeleteFileResponse,
  GenerateSignedPostPolicyV4Options,
  GetSignedUrlConfig,
  Storage,
} from '@google-cloud/storage'
import https from 'https'
import { Err, fromPromise, Ok, ok, Result } from 'neverthrow'
import { Readable } from 'stream'

import { InternalErrorCode } from '../dtos'
import { FileMimeType, FilePath } from '../dtos/file'
import { ElysiaLoggerInstance } from '../plugins'
import { exhaustiveGuard } from '../utils/common'
import { ApiErrorResponse, err, OnlyErr, WithoutErr } from '../utils/error'
import { getFilePath, MIME_TYPE_TO_EXTENSION } from '../utils/file'

export type FileTransactionEntry =
  | {
      action: 'MOVE'
      from: string
      to: string
    }
  | {
      action: 'UPLOAD'
      target: string
    }

export class FileService {
  public prefixPublicFolder = 'public/' as const
  public prefixPrivateFolder = 'private/' as const
  public prefixDeletedFolder = 'deleted/' as const
  public prefixTempFolder = 'temp/' as const

  private storage: Storage
  private bucket: ReturnType<Storage['bucket']>

  constructor(
    config: {
      projectId?: string
      bucketName: string
      clientEmail?: string
      privateKey?: string
    },
    public readonly loggerService: ElysiaLoggerInstance
  ) {
    this.storage = new Storage({
      projectId: config.projectId,
      credentials:
        config.clientEmail && config.privateKey
          ? {
              client_email: config.clientEmail,
              private_key: config.privateKey,
            }
          : undefined,
    })
    this.bucket = this.storage.bucket(config.bucketName)
  }

  private async moveFileAndPermission(file: string, prefix: string) {
    const newPath = `${prefix}${getFilePath(file)}`
    const moveResult = await this.moveFile(file, newPath)

    if (moveResult.isErr()) {
      return err(moveResult.error)
    }

    return ok(newPath)
  }

  private async bulkMoveToFolder(files: string[], prefix: string) {
    const moveResults = await Promise.all(
      files.map(async (file) => {
        if (file.startsWith(prefix)) return ok(file)
        return await this.moveFileAndPermission(file, prefix)
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

  async bulkMoveToPrivateFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixPrivateFolder)
  }

  async bulkDeleteFile(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixDeletedFolder)
  }

  async bulkMoveToPublicFolder(files: string[]) {
    return this.bulkMoveToFolder(files, this.prefixPublicFolder)
  }

  getFilePathFromMimeType(basePath: FilePath, contentType: FileMimeType) {
    const extension = MIME_TYPE_TO_EXTENSION[contentType]
    if (!extension) {
      return err({
        code: InternalErrorCode.FILE_UNSUPPORTED_MIME_TYPE,
        message: 'Invalid file mime type',
      })
    }
    return ok(`${basePath}.${extension}` satisfies FilePath)
  }

  async createUploadSignedUrl(
    fileKey: string,
    config?: {
      expiresIn?: number
      maxSize?: number
      contentType?: string
    }
  ) {
    const expiresIn = config?.expiresIn ?? 5 * 60
    const maxSize = config?.maxSize ?? 5 * 1024 * 1024
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
        message: 'Failed to get one or more signed URLs',
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
    return this.bucket.file(fileKey).publicUrl()
  }

  async removeFile(fileKey: string): Promise<
    Result<
      DeleteFileResponse,
      {
        code: 'FILE_DELETE_ERROR'
        message: string
      }
    >
  > {
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
      const result = await cb(fileTransaction)

      // NOTE: If the result is an Err which parts of our expected errors, rethrow it to trigger the rollback
      if (result instanceof Err) {
        throw result
      }

      return [result, fileTransaction] as any
    } catch (err) {
      const errorBody = err instanceof Err ? err.error : err instanceof Error ? err.message : err
      this.loggerService.warn({
        message: 'File transaction failed, rolling back changes',
        context: { err: errorBody },
      })

      const rollbackResult = await fileTransaction.rollback()
      if (rollbackResult.isErr()) return rollbackResult as any
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

  private async bulkMoveToFolder(fileKeys: FilePath[], prefixFolder: string) {
    const newFileKeys: FilePath[] = []
    for (const fileKey of fileKeys) {
      if (fileKey.startsWith(prefixFolder)) {
        newFileKeys.push(fileKey)
        continue
      }

      const newFileKey = (prefixFolder + getFilePath(fileKey)) as FilePath
      const result = await this.moveFile(fileKey, newFileKey)

      if (result.isErr()) {
        return err(result.error)
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

  async bulkDeleteFile(fileKeys: FilePath[]) {
    return await this.bulkMoveToFolder(fileKeys, this.fileService.prefixDeletedFolder)
  }

  async deleteFile(fileKey: FilePath) {
    return await this.bulkDeleteFile([fileKey])
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
          result = await this.fileService.removeFile(entry.target)

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

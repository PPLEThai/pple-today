import {
  GenerateSignedPostPolicyV4Options,
  GetSignedUrlConfig,
  Storage,
} from '@google-cloud/storage'
import Elysia from 'elysia'
import https from 'https'
import { fromPromise, Ok, ok } from 'neverthrow'
import { Readable } from 'stream'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import { err } from '../../utils/error'

export class FileService {
  public prefixPublicFolder = 'public/' as const
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

  async bulkMarkAsPublic(files: string[]) {
    const results = await fromPromise(
      Promise.all(files.map((file) => this.bucket.file(file).makePublic())),
      (err) => ({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: (err as Error).message,
      })
    )

    if (results.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    return ok(files)
  }

  async bulkMarkAsPrivate(files: string[]) {
    const results = await fromPromise(
      Promise.all(files.map((file) => this.bucket.file(file).makePrivate())),
      (err) => ({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: (err as Error).message,
      })
    )

    if (results.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    return ok(files)
  }

  async bulkDeleteFile(files: string[]) {
    const results = await fromPromise(
      Promise.all(files.map((file) => this.bucket.file(file).delete())),
      (err) => ({
        code: InternalErrorCode.FILE_DELETE_ERROR,
        message: (err as Error).message,
      })
    )

    if (results.isErr()) {
      return err({
        code: InternalErrorCode.FILE_DELETE_ERROR,
        message: 'Failed to delete one or more files',
      })
    }

    return ok(files)
  }

  async moveFileToPublicFolder(files: string[]) {
    const moveResults = await Promise.all(
      files.map(async (file) => {
        if (file.startsWith(this.prefixTempFolder)) {
          const realPath = `${this.prefixPublicFolder}${file.slice(this.prefixTempFolder.length)}`
          const realAttachment = await this.moveFile(file, realPath)

          if (realAttachment.isErr()) {
            return err(realAttachment.error)
          }

          return ok(realPath)
        }

        return ok(file)
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
    return fileKeys.map((fileKey) => decodeURIComponent(this.bucket.file(fileKey).publicUrl()))
  }

  getPublicFileUrl(fileKey: string) {
    return decodeURIComponent(this.bucket.file(fileKey).publicUrl())
  }

  async uploadProfilePagePicture(url: string, pageId: string) {
    const destination = `pages/profile-picture-${pageId}.jpg`
    const result = await this.uploadFileFromUrl(url, destination)

    if (result.isErr()) {
      return result
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

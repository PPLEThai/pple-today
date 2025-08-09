import { GetSignedUrlConfig, Storage } from '@google-cloud/storage'
import Elysia from 'elysia'
import https from 'https'
import { fromPromise, ok } from 'neverthrow'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import { err } from '../../utils/error'

export class FileService {
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

  async getUploadSignedUrl(
    fileKey: string,
    config?: {
      expiresIn?: number
      maxSize?: number
    }
  ) {
    const expiresIn = config?.expiresIn ?? 3600
    const maxSize = config?.maxSize ?? 1048576

    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresIn * 1000,
      contentType: 'application/octet-stream',
      extensionHeaders: {
        'X-Goog-Content-Length-Range': `0,${maxSize}`,
      },
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

  async batchGetFileSignedUrl(
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

  async batchGetPublicFileUrl(fileKeys: string[]) {
    return ok(fileKeys.map((fileKey) => this.bucket.file(fileKey).publicUrl()))
  }

  async getPublicFileUrl(fileKey: string) {
    return ok(this.bucket.file(fileKey).publicUrl())
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

import node from '@elysiajs/node'
import { GetSignedUrlConfig, Storage } from '@google-cloud/storage'
import Elysia from 'elysia'
import https from 'https'
import { fromPromise, ok } from 'neverthrow'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'

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

  async getSignedUrl(fileKey: string, expiresIn: number = 3600) {
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
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

  async uploadProfilePagePicture(url: string, pageId: string) {
    const destination = `pages/profile-picture-${pageId}.jpg`
    const result = await this.uploadFileStream(url, destination)

    if (result.isErr()) {
      return result
    }

    return ok(destination)
  }

  /**
   * ## Warning
   * - Please take very good care of the URL you are passing here. because it might lead to SSRF attacks if the URL is not properly validated.
   */
  async uploadFileStream(url: string, destination: string) {
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
  adapter: node(),
}).decorate(() => ({
  fileService: new FileService({
    projectId: serverEnv.GCP_PROJECT_ID,
    clientEmail: serverEnv.GCP_CLIENT_EMAIL,
    privateKey: serverEnv.GCP_PRIVATE_KEY,
    bucketName: serverEnv.GCP_STORAGE_BUCKET_NAME,
  }),
}))

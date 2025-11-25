import { PolicyFields } from '@google-cloud/storage'
import { ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InternalErrorCode } from '../dtos'
import { err, fromRepositoryPromise } from '../utils'

class FileObject {
  constructor(private path: string) {}

  async makePublic() {
    return Promise.resolve()
  }

  async makePrivate() {
    return Promise.resolve()
  }

  async move(_: FileObject) {
    return Promise.resolve()
  }

  publicUrl() {
    return `https://storage.googleapis.com/fake-bucket/${encodeURIComponent(this.path)}`
  }

  delete() {
    return Promise.resolve()
  }

  generateSignedPostPolicyV4(_: any): Promise<
    [
      {
        url: string
        fields: PolicyFields
      },
    ]
  > {
    return Promise.resolve([
      {
        url: `https://storage.googleapis.com/fake-bucket/${encodeURIComponent(this.path)}`,
        fields: {
          key: this.path,
          acl: 'public-read',
          'Content-Type': 'application/octet-stream',
          'x-goog-credential': 'test-credential',
          'x-goog-date': 'test-date',
          'x-goog-algorithm': 'test-algorithm',
        },
      },
    ])
  }

  getSignedUrl(_: any): Promise<string> {
    return Promise.resolve(
      `https://storage.googleapis.com/fake-bucket/${encodeURIComponent(this.path)}`
    )
  }
}

class Bucket {
  private name: string

  constructor(name: string) {
    this.name = name
  }

  file(path: string) {
    return new FileObject(path)
  }
}

class Storage {
  constructor(_: any) {}

  bucket(name: string) {
    return new Bucket(name)
  }
}

const StorageConstructor = vi.fn().mockImplementation((config) => {
  return new Storage(config)
})

vi.mock('@google-cloud/storage', () => {
  return {
    Storage: StorageConstructor,
  }
})

const loggerService = {
  log: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

const StorageBucketSpy = vi.spyOn(Storage.prototype, 'bucket')
const BucketFileSpy = vi.spyOn(Bucket.prototype, 'file')
const FileMoveSpy = vi.spyOn(FileObject.prototype, 'move')
const FilePublicUrlSpy = vi.spyOn(FileObject.prototype, 'publicUrl')
const FileDeleteSpy = vi.spyOn(FileObject.prototype, 'delete')
const FileGenerateSignedPostPolicyV4Spy = vi.spyOn(
  FileObject.prototype,
  'generateSignedPostPolicyV4'
)
const FileGetSignedUrlSpy = vi.spyOn(FileObject.prototype, 'getSignedUrl')
const DateNowSpy = vi.spyOn(Date, 'now')

describe('File service', async () => {
  const { FileService, FileTransactionService } = await import('./file')

  beforeEach(() => {
    StorageConstructor.mockClear()
    StorageBucketSpy.mockClear()
    BucketFileSpy.mockClear()
    FileMoveSpy.mockReset()
    FilePublicUrlSpy.mockReset()
    FileDeleteSpy.mockReset()
    FileGetSignedUrlSpy.mockReset()
    FileGenerateSignedPostPolicyV4Spy.mockReset()
    DateNowSpy.mockReset()

    loggerService.log.mockReset()
    loggerService.error.mockReset()
    loggerService.info.mockReset()
    loggerService.warn.mockReset()
  })

  const createFileService = () => {
    const storage = new FileService(
      {
        projectId: 'test-project-id',
        bucketName: 'test-bucket-name',
        clientEmail: 'test-client-email',
        privateKey: 'test-private-key',
      },
      loggerService as any
    )
    return storage
  }

  describe('FileService class', () => {
    it('should initialize with correct parameters', () => {
      createFileService()
      expect(StorageConstructor).toHaveBeenCalledWith({
        projectId: 'test-project-id',
        credentials: {
          client_email: 'test-client-email',
          private_key: 'test-private-key',
        },
      })
      expect(StorageBucketSpy).toHaveBeenCalledWith('test-bucket-name')
    })

    describe('createUploadSignedUrl', () => {
      it('should call generateSignedPostPolicyV4 on the file object when createUploadSignedUrl is called', async () => {
        DateNowSpy.mockReturnValue(1609459200000) // Mock current date to Jan 1, 2021
        const fileService = createFileService()
        await fileService.createUploadSignedUrl('path/to/file.txt', {
          expiresIn: 60,
          maxSize: 5 * 1024 * 1024,
          contentType: 'application/octet-stream',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FileGenerateSignedPostPolicyV4Spy).toHaveBeenCalledWith({
          expires: 1609459200000 + 60000,
          fields: {
            'Content-Type': 'application/octet-stream',
          },
          conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024],
            ['eq', '$Content-Type', 'application/octet-stream'],
          ],
        })
      })

      it('should return correct error if generateSignedPostPolicyV4 fails', async () => {
        FileGenerateSignedPostPolicyV4Spy.mockImplementationOnce(async () => {
          throw new Error('Failed to generate signed URL')
        })

        const fileService = createFileService()
        const result = await fileService.createUploadSignedUrl('path/to/file.txt', {
          expiresIn: 60,
          maxSize: 5 * 1024 * 1024,
          contentType: 'application/octet-stream',
        })

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          message: 'Failed to generate signed URL',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FileGenerateSignedPostPolicyV4Spy).toHaveBeenCalled()
      })
    })

    describe('bulkMoveToPublicFolder', () => {
      it('should call markAsPublic with new path when bulkMoveToPublicFolder is called', async () => {
        const fileService = createFileService()
        await fileService.bulkMoveToPublicFolder(['temp/folder/file1.txt', 'temp/folder/file2.txt'])

        expect(BucketFileSpy).toHaveBeenCalledWith('public/folder/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('public/folder/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('public/folder/file2.txt'))
      })

      it('should return correct error if moveFile fails', async () => {
        FileMoveSpy.mockImplementation(async () => {
          throw new Error('Failed to move file')
        })

        const fileService = createFileService()
        const result = await fileService.bulkMoveToPublicFolder([
          'temp/folder/file1.txt',
          'temp/folder/file2.txt',
        ])

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_MOVE_ERROR,
          message: 'Failed to move one or more files',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('public/folder/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('public/folder/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('public/folder/file2.txt'))
      })
    })

    describe('bulkMoveToPrivateFolder', () => {
      it('should call markAsPrivate with new path when bulkMoveToPrivateFolder is called', async () => {
        const fileService = createFileService()
        await fileService.bulkMoveToPrivateFolder([
          'temp/folder/file1.txt',
          'temp/folder/file2.txt',
        ])

        expect(BucketFileSpy).toHaveBeenCalledWith('private/folder/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('private/folder/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('private/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('private/folder/file2.txt'))
      })

      it('should return correct error if moveFile fails', async () => {
        FileMoveSpy.mockImplementation(async () => {
          throw new Error('Failed to move file')
        })

        const fileService = createFileService()
        const result = await fileService.bulkMoveToPrivateFolder([
          'temp/folder/file1.txt',
          'temp/folder/file2.txt',
        ])

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_MOVE_ERROR,
          message: 'Failed to move one or more files',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('private/folder/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('private/folder/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('private/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('private/folder/file2.txt'))
      })
    })

    describe('bulkDeleteFile', () => {
      it('should call move file with correct paths when bulkDeleteFile is called', async () => {
        const fileService = createFileService()
        await fileService.bulkDeleteFile(['path/to/file1.txt', 'path/to/file2.txt'])

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('deleted/to/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('deleted/to/file2.txt'))
      })

      it('should return correct error if moveFile fails', async () => {
        FileMoveSpy.mockImplementation(async () => {
          throw new Error('Failed to move file')
        })

        const fileService = createFileService()
        const result = await fileService.bulkDeleteFile(['path/to/file1.txt', 'path/to/file2.txt'])

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_MOVE_ERROR,
          message: 'Failed to move one or more files',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file2.txt')

        expect(FileMoveSpy).toHaveBeenCalledTimes(2)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('deleted/to/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('deleted/to/file2.txt'))
      })
    })

    describe('getPublicFileUrl', () => {
      it('should return the public URL of the file when getPublicUrl is called', async () => {
        const fileService = createFileService()
        const publicUrl = fileService.getPublicFileUrl('path/to/file.txt')

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FilePublicUrlSpy).toHaveBeenCalled()
        expect(publicUrl).toEqual('https://storage.googleapis.com/fake-bucket/path%2Fto%2Ffile.txt')
      })
    })

    describe('bulkGetPublicFileUrl', () => {
      it('should return the public URLs of the files when bulkGetPublicFileUrl is called', async () => {
        const fileService = createFileService()
        const publicUrls = fileService.bulkGetPublicFileUrl([
          'path/to/file1.txt',
          'path/to/file2.txt',
        ])

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file2.txt')
        expect(FilePublicUrlSpy).toHaveBeenCalledTimes(2)
        expect(publicUrls).toEqual([
          'https://storage.googleapis.com/fake-bucket/path%2Fto%2Ffile1.txt',
          'https://storage.googleapis.com/fake-bucket/path%2Fto%2Ffile2.txt',
        ])
      })
    })

    describe('getFilePathFromMimeType', () => {
      it('should get correct file path when getFilePath is called', async () => {
        const fileService = createFileService()
        const filePath = fileService.getFilePathFromMimeType(
          'public/folder/file',
          'application/vnd.ms-powerpoint'
        )

        expect(filePath).toEqual(ok('public/folder/file.ppt'))
      })
    })

    describe('removeFile', () => {
      it('should call delete on the file object when removeFile is called', async () => {
        const fileService = createFileService()
        await fileService.removeFile('path/to/file.txt')

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FileDeleteSpy).toHaveBeenCalled()
      })
    })

    describe('getFileSignedUrl', () => {
      it('should call getSignedUrl on the file object when getFileSignedUrl is called', async () => {
        DateNowSpy.mockReturnValue(1609459200000) // Mock current date to Jan 1, 2021
        const fileService = createFileService()
        await fileService.getFileSignedUrl('path/to/file.txt', {
          expiresIn: 15 * 60, // 1 hour
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FileGetSignedUrlSpy).toHaveBeenCalledWith({
          version: 'v4',
          action: 'read',
          expires: 1609459200000 + 15 * 60 * 1000,
        })
      })

      it('should return correct error if getSignedUrl fails', async () => {
        FileGetSignedUrlSpy.mockImplementationOnce(async () => {
          throw new Error('Failed to get signed URL')
        })

        const fileService = createFileService()
        const result = await fileService.getFileSignedUrl('path/to/file.txt')

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          message: 'Failed to get signed URL',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file.txt')
        expect(FileGetSignedUrlSpy).toHaveBeenCalled()
      })
    })

    describe('bulkGetFileSignedUrl', () => {
      it('should call getSignedUrl on the file objects when bulkGetFileSignedUrl is called', async () => {
        DateNowSpy.mockReturnValue(1609459200000) // Mock current date to Jan 1, 2021
        const fileService = createFileService()
        await fileService.bulkGetFileSignedUrl(['path/to/file1.txt', 'path/to/file2.txt'], {
          expiresIn: 30 * 60, // 30 minutes
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file2.txt')
        expect(FileGetSignedUrlSpy).toHaveBeenCalledTimes(2)
        expect(FileGetSignedUrlSpy).toHaveBeenNthCalledWith(1, {
          version: 'v4',
          action: 'read',
          expires: 1609459200000 + 30 * 60 * 1000,
        })
        expect(FileGetSignedUrlSpy).toHaveBeenNthCalledWith(2, {
          version: 'v4',
          action: 'read',
          expires: 1609459200000 + 30 * 60 * 1000,
        })
      })

      it('should return correct error if getSignedUrl fails', async () => {
        FileGetSignedUrlSpy.mockImplementationOnce(async () => {
          throw new Error('Failed to get signed URL')
        })

        const fileService = createFileService()
        const result = await fileService.bulkGetFileSignedUrl([
          'path/to/file1.txt',
          'path/to/file2.txt',
        ])

        expect(result.isErr()).toBe(true)
        expect(result._unsafeUnwrapErr()).toEqual({
          code: InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          message: 'Failed to get one or more signed URLs',
        })

        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file1.txt')
        expect(BucketFileSpy).toHaveBeenCalledWith('path/to/file2.txt')
        expect(FileGetSignedUrlSpy).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('FileTransactionService class', () => {
    it('should return an instance of FileTransactionService when getTransactionService is called', async () => {
      const fileService = createFileService()
      const txResult = await fromRepositoryPromise(
        fileService.$transaction(async () => {
          return {}
        })
      )

      const [result, txService] = txResult._unsafeUnwrap()

      expect(txService).toBeInstanceOf(FileTransactionService)
      expect(result).toEqual({})
    })

    describe('bulkMoveToPublicFolder', () => {
      it('should call moveFile with changed permission when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkMoveToPublicFolder([
              'temp/folder/file1.txt',
              'temp/folder/file2.txt',
              'temp/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(3)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('public/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('public/folder/file3.txt'))

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['public/folder/file1.txt', 'public/folder/file2.txt', 'public/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })

      it('should not call move if files are not changed when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkMoveToPublicFolder([
              'public/folder/file1.txt',
              'public/folder/file2.txt',
              'public/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(0)

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['public/folder/file1.txt', 'public/folder/file2.txt', 'public/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })
    })

    describe('bulkMoveToPrivateFolder', () => {
      it('should call move with changed permission when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkMoveToPrivateFolder([
              'public/folder/file1.txt',
              'public/folder/file2.txt',
              'public/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(3)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('private/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('private/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('private/folder/file3.txt'))

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['private/folder/file1.txt', 'private/folder/file2.txt', 'private/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })

      it('should call move with unchanged permission when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkMoveToPrivateFolder([
              'temp/folder/file1.txt',
              'temp/folder/file2.txt',
              'temp/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(3)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('private/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('private/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('private/folder/file3.txt'))

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['private/folder/file1.txt', 'private/folder/file2.txt', 'private/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })

      it('should not call move if files are not changed when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkMoveToPrivateFolder([
              'private/folder/file1.txt',
              'private/folder/file2.txt',
              'private/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(0)

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['private/folder/file1.txt', 'private/folder/file2.txt', 'private/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })
    })

    describe('bulkDeleteFile', () => {
      it('should call move with changed permission when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkDeleteFile([
              'public/folder/file1.txt',
              'public/folder/file2.txt',
              'public/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(3)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('deleted/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('deleted/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('deleted/folder/file3.txt'))

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['deleted/folder/file1.txt', 'deleted/folder/file2.txt', 'deleted/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })

      it('should call move with unchanged permission when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkDeleteFile([
              'temp/folder/file1.txt',
              'temp/folder/file2.txt',
              'temp/folder/file3.txt',
            ])
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(3)
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('deleted/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('deleted/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('deleted/folder/file3.txt'))

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['deleted/folder/file1.txt', 'deleted/folder/file2.txt', 'deleted/folder/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })

      it('should not call move if files are not changed when called within a transaction', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            return tx.bulkDeleteFile([
              'deleted/to/file1.txt',
              'deleted/to/file2.txt',
              'deleted/to/file3.txt',
            ] as any)
          })
        )

        expect(FileMoveSpy).toHaveBeenCalledTimes(0)

        expect(txResult.isOk()).toBe(true)

        expect(txResult._unsafeUnwrap()).toEqual([
          ok(['deleted/to/file1.txt', 'deleted/to/file2.txt', 'deleted/to/file3.txt']),
          expect.any(FileTransactionService),
        ])
      })
    })

    describe('rollback', () => {
      it('should be called with correct operation order when throw error', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            await tx.bulkMoveToPublicFolder([
              'temp/folder/file1.txt',
              'temp/folder/file2.txt',
              'temp/folder/file3.txt',
            ])
            await tx.bulkMoveToPrivateFolder([
              'public/folder/file4.txt',
              'public/folder/file5.txt',
              'public/folder/file6.txt',
            ])
            throw new Error('Some error')
          })
        )

        expect(txResult.isErr()).toBe(true)
        expect(txResult._unsafeUnwrapErr()).toEqual({
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          originalError: new Error('Some error'),
        })
        expect(loggerService.warn).toBeCalledWith({
          message: 'File transaction failed, rolling back changes',
          context: {
            err: 'Some error',
          },
        })

        // 6 + 6 for move to public and private folder
        // 6 for move rollback from private folder
        // 6 for move rollback from public folder
        expect(FileMoveSpy).toHaveBeenCalledTimes(12)

        // Normal Operations
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('public/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('public/folder/file3.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(4, new FileObject('private/folder/file4.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(5, new FileObject('private/folder/file5.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(6, new FileObject('private/folder/file6.txt'))

        // Rollback Operations
        expect(FileMoveSpy).toHaveBeenNthCalledWith(7, new FileObject('public/folder/file6.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(8, new FileObject('public/folder/file5.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(9, new FileObject('public/folder/file4.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(10, new FileObject('temp/folder/file3.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(11, new FileObject('temp/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(12, new FileObject('temp/folder/file1.txt'))
      })

      it('should be called with correct operation order when return neverthrow error', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            await tx.bulkMoveToPublicFolder([
              'temp/folder/file1.txt',
              'temp/folder/file2.txt',
              'temp/folder/file3.txt',
            ])
            await tx.bulkMoveToPrivateFolder([
              'public/folder/file4.txt',
              'public/folder/file5.txt',
              'public/folder/file6.txt',
            ])
            return err({
              code: 'SOME_ERROR_CODE',
              message: 'Some error',
            } as any)
          })
        )

        expect(txResult.isErr()).toBe(true)
        expect(txResult._unsafeUnwrapErr()).toEqual({
          code: 'SOME_ERROR_CODE',
          message: 'Some error',
        })

        expect(loggerService.warn).toBeCalledWith({
          message: 'File transaction failed, rolling back changes',
          context: {
            err: {
              code: 'SOME_ERROR_CODE',
              message: 'Some error',
            },
          },
        })

        // 6 + 6 for move to public and private folder
        // 6 for move rollback from private folder
        // 6 for move rollback from public folder
        expect(FileMoveSpy).toHaveBeenCalledTimes(12)

        // Normal Operations
        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('public/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('public/folder/file3.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(4, new FileObject('private/folder/file4.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(5, new FileObject('private/folder/file5.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(6, new FileObject('private/folder/file6.txt'))

        // Rollback Operations
        expect(FileMoveSpy).toHaveBeenNthCalledWith(7, new FileObject('public/folder/file6.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(8, new FileObject('public/folder/file5.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(9, new FileObject('public/folder/file4.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(10, new FileObject('temp/folder/file3.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(11, new FileObject('temp/folder/file2.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(12, new FileObject('temp/folder/file1.txt'))
      })

      it('should be called with correct operation order when manually rollback', async () => {
        const fileService = createFileService()
        const txResult = await fromRepositoryPromise(
          fileService.$transaction(async (tx) => {
            await tx.bulkMoveToPublicFolder(['temp/folder/file1.txt'])
            await tx.bulkMoveToPrivateFolder(['public/folder/file4.txt'])
            return {}
          })
        )

        expect(txResult.isOk()).toBe(true)
        expect(txResult._unsafeUnwrap()[0]).toEqual({})

        await txResult._unsafeUnwrap()[1].rollback()

        expect(FileMoveSpy).toHaveBeenCalledTimes(4)

        expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('private/folder/file4.txt'))

        expect(FileMoveSpy).toHaveBeenNthCalledWith(3, new FileObject('public/folder/file4.txt'))
        expect(FileMoveSpy).toHaveBeenNthCalledWith(4, new FileObject('temp/folder/file1.txt'))
      })

      describe('should return error if rollback move fails', () => {
        it('when moving to public folder', async () => {
          let callCount = 0
          FileMoveSpy.mockImplementation(async () => {
            callCount++
            if (callCount === 2) {
              throw new Error('Failed to move file')
            }
          })

          const fileService = createFileService()
          const txResult = await fromRepositoryPromise(
            fileService.$transaction(async (tx) => {
              await tx.bulkMoveToPublicFolder(['temp/folder/file1.txt'])
              throw new Error('Some error')
            })
          )

          expect(txResult.isErr()).toBe(true)
          expect(txResult._unsafeUnwrapErr()).toEqual({
            code: InternalErrorCode.FILE_ROLLBACK_FAILED,
            message: 'Failed to move file temp/folder/file1.txt during rollback',
          })

          expect(FileMoveSpy).toHaveBeenCalledTimes(2)
          expect(FileMoveSpy).toHaveBeenNthCalledWith(1, new FileObject('public/folder/file1.txt'))
          expect(FileMoveSpy).toHaveBeenNthCalledWith(2, new FileObject('temp/folder/file1.txt'))
        })
      })
    })
  })
})

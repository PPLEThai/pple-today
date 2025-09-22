import { describe, expect, it } from 'vitest'

import { getFileName, getFilePath, MIME_TYPE_TO_EXTENSION } from './file'

describe('File utility', () => {
  describe('getFileName', () => {
    it('should correctly return the filename', () => {
      const filePath = 'http://example.com/path/to/file.txt'
      const fileName = getFileName(filePath)

      expect(fileName).toStrictEqual('file.txt')
    })

    it('should return only the filename without query params', () => {
      const filePath = 'http://example.com/path/to/file.txt?version=1.2.3'
      const fileName = getFileName(filePath)

      expect(fileName).toStrictEqual('file.txt')
    })
  })

  describe('getFilePath', () => {
    it('should correctly return the file path without leading slash', () => {
      const fullPath = 'path/to/file.txt'
      const filePath = getFilePath(fullPath)

      expect(filePath).toStrictEqual('to/file.txt')
    })
  })

  describe('MIME_TYPE_TO_EXTENSION', () => {
    it('should have correct mappings for MIME types to file extensions', () => {
      expect(MIME_TYPE_TO_EXTENSION['image/png']).toBe('png')
      expect(MIME_TYPE_TO_EXTENSION['image/jpeg']).toBe('jpg')
      expect(MIME_TYPE_TO_EXTENSION['image/webp']).toBe('webp')
      expect(MIME_TYPE_TO_EXTENSION['application/pdf']).toBe('pdf')
      expect(MIME_TYPE_TO_EXTENSION['application/msword']).toBe('doc')
      expect(
        MIME_TYPE_TO_EXTENSION[
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      ).toBe('docx')
      expect(MIME_TYPE_TO_EXTENSION['application/vnd.ms-excel']).toBe('xls')
      expect(
        MIME_TYPE_TO_EXTENSION['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      ).toBe('xlsx')
      expect(MIME_TYPE_TO_EXTENSION['application/vnd.ms-powerpoint']).toBe('ppt')
      expect(
        MIME_TYPE_TO_EXTENSION[
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ]
      ).toBe('pptx')
    })
  })
})

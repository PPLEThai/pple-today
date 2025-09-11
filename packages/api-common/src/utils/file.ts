import { FileMimeType } from '../dtos'

export const MIME_TYPE_TO_EXTENSION: Record<FileMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

export const getFileName = (url: string) => {
  const instanceUrl = new URL(url)

  return instanceUrl.pathname.split('/').slice(-1)[0]
}

export const getFilePath = (fullPath: string) => {
  return fullPath.split('/').slice(1).join('/')
}

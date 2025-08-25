export const FilePermission = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const
export type FilePermission = (typeof FilePermission)[keyof typeof FilePermission]

export type FileTransactionEntry =
  | {
      action: 'PERMISSION'
      target: string
      before: FilePermission
      after: FilePermission
    }
  | {
      action: 'MOVE'
      from: string
      to: string
    }
  | {
      action: 'UPLOAD'
      target: string
    }

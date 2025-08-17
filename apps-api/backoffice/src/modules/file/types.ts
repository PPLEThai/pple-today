export const FilePermission = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const
export type FilePermission = (typeof FilePermission)[keyof typeof FilePermission]

export type FileTransactionEntry =
  | {
      target: string
      action: {
        type: 'PERMISSION'
        permission: {
          before: FilePermission
          after: FilePermission
        }
      }
    }
  | {
      target: string
      action: {
        type: 'MOVE'
        to: string
      }
    }
  | {
      target: string
      action: {
        type: 'UPLOAD'
      }
    }

export type FileTransactionEntry =
  | {
      target: string
      action: {
        type: 'PERMISSION'
        permission: {
          before: 'PUBLIC' | 'PRIVATE'
          after: 'PUBLIC' | 'PRIVATE'
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

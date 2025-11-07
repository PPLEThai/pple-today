import React from 'react'

export interface EditOnsiteResultState {
  isEdit: boolean
  result: OnsiteResult[]
}

export interface OnsiteResult {
  candidateId: string
  votes: number
}

export type EditOnsiteResultAction =
  | {
      type: 'toggle'
    }
  | {
      type: 'set'
      payload: OnsiteResult
    }

interface EditOnsiteResultContext {
  state: EditOnsiteResultState
  dispatch: React.Dispatch<EditOnsiteResultAction>
}

export const EditOnsiteResultContext = React.createContext<EditOnsiteResultContext | null>(null)

export function EditOnsiteResultReducer(
  s: EditOnsiteResultState,
  a: EditOnsiteResultAction
): EditOnsiteResultState {
  const next = { ...s }
  let idx

  switch (a.type) {
    case 'toggle':
      next.isEdit = !next.isEdit
      break
    case 'set':
      idx = next.result.findIndex((n) => n.candidateId === a.payload.candidateId)
      if (idx === -1) break
      next.result[idx] = a.payload
      break
  }

  return next
}

export function useEditOnsiteResultContext() {
  const context = React.useContext(EditOnsiteResultContext)
  if (!context) {
    throw new Error('useEditOnsiteResultContext must be used within an EditOnsiteResultProvider')
  }
  return context
}

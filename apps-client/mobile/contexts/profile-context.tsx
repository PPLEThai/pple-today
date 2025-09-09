import React from 'react'

import { ImagePickerSuccessResult } from 'expo-image-picker'

export interface EditingState {
  profileStepResult: EditingProfileState | null
  addressStepResult: EditingAddressState | null
}

export interface EditingProfileState {
  name: string
  imagePickerResult?: ImagePickerSuccessResult
}

export interface EditingAddressState {
  province: string
  district: string
  subDistrict: string
  postalCode: string
}

export const EditingInitialState: EditingState = {
  profileStepResult: null,
  addressStepResult: null,
}

export type EditingAction =
  | {
      type: 'reset'
    }
  | {
      type: 'resetAddressState'
    }
  | {
      type: 'setEditingProfileResults'
      payload: EditingProfileState
    }
  | {
      type: 'setEditingAddressResults'
      payload: EditingAddressState
    }

interface EditingContextValue {
  state: EditingState
  dispatch: React.Dispatch<EditingAction>
}

export const EditingContext = React.createContext<EditingContextValue | null>(null)

interface EditingProviderProps {
  children: React.ReactNode
}

export function EditingProvider(props: EditingProviderProps) {
  const [state, dispatch] = React.useReducer(EditingReducer, EditingInitialState)

  return (
    <EditingContext.Provider value={{ state, dispatch }}>{props.children}</EditingContext.Provider>
  )
}

export function EditingReducer(s: EditingState, a: EditingAction): EditingState {
  const next = { ...s }

  switch (a.type) {
    case 'reset':
      return EditingInitialState
    case 'resetAddressState':
      next.addressStepResult = null
      break
    case 'setEditingProfileResults':
      next.profileStepResult = a.payload
      break
    case 'setEditingAddressResults':
      next.addressStepResult = a.payload
      break
    default:
      break
  }

  return next
}

export function useEditingContext() {
  const context = React.useContext(EditingContext)
  if (!context) {
    throw new Error('useEditingContext must be used within an EditingProvider')
  }
  return context
}

import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Stack } from 'expo-router'

export default function EditingLayout() {
  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <EditingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="edit-address" />
        </Stack>
      </EditingProvider>
    </SafeAreaView>
  )
}

export interface EditingState {
  addressStepResult: EditingAddressState | null
}

export interface EditingAddressState {
  province: string
  district: string
  subDistrict: string
  postalCode: string
}

export const EditingInitialState: EditingState = {
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

function EditingProvider(props: EditingProviderProps) {
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

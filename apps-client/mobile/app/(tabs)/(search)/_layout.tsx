import React from 'react'

import { Stack } from 'expo-router'

import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'

export default function Layout() {
  return (
    <KeyboardAvoidingViewLayout>
      <SearchingProvider>
        <Stack
          initialRouteName="index"
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen name="index" />
        </Stack>
      </SearchingProvider>
    </KeyboardAvoidingViewLayout>
  )
}

export interface SearchingState {
  searchQuery: string
}

export const SearchingInitialState: SearchingState = {
  searchQuery: '',
}

export type SearchingAction =
  | {
      type: 'updateQuery'
      query: string
    }
  | {
      type: 'resetQuery'
    }

interface SearchingContextValue {
  state: SearchingState
  dispatch: React.Dispatch<SearchingAction>
}

export const SearchingContext = React.createContext<SearchingContextValue | null>(null)

interface SearchingProviderProps {
  children: React.ReactNode
}

function SearchingProvider(props: SearchingProviderProps) {
  const [state, dispatch] = React.useReducer(SearchingReducer, SearchingInitialState)

  return (
    <SearchingContext.Provider value={{ state, dispatch }}>
      {props.children}
    </SearchingContext.Provider>
  )
}

export function SearchingReducer(s: SearchingState, a: SearchingAction): SearchingState {
  const next = { ...s }

  switch (a.type) {
    case 'resetQuery':
      return SearchingInitialState
    case 'updateQuery':
      next.searchQuery = a.query
      break
    default:
      break
  }

  return next
}

export function useSearchingContext() {
  const context = React.useContext(SearchingContext)
  if (!context) {
    throw new Error('useSearchingContext must be used within an EditingProvider')
  }
  return context
}

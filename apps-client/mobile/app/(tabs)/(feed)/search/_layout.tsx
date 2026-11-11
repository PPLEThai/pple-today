import React from 'react'

import { Stack } from 'expo-router'

import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'

// Expo Router 58 replaced the Stack's `initialRouteName` with this: the screen
// placed below one opened by a deep link, so back has somewhere to go.
export const unstable_settings = {
  anchor: 'index',
}

export default function Layout() {
  return (
    <KeyboardAvoidingViewLayout>
      <SearchingProvider>
        <Stack screenOptions={{ headerShown: false }} />
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

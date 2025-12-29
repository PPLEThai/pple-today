import React, { useContext, useEffect, useMemo } from 'react'

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { SplashScreen } from 'components/SplashScreen'

import { GetAuthMeResponse } from '@api/backoffice/admin'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

export interface AuthState {
  user: GetAuthMeResponse | null
  isAuthenticated: boolean
}

export const InitialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
}

const AuthContext = React.createContext<AuthState | null>(null)

export const userQueryOptions = queryOptions({
  queryKey: ['oidc', 'user'],
  queryFn: () => userManager.getUser(),
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const userQuery = useQuery(userQueryOptions)
  useEffect(() => {
    if (userQuery.isError) {
      console.error('SSO user error:', userQuery.error)
    }
  }, [userQuery])

  const authMeQuery = reactQueryClient.useQuery(
    '/admin/auth/me',
    {},
    { retry: false, enabled: userQuery.isSuccess && !!userQuery.data }
  )
  useEffect(() => {
    const handleError = async () => {
      if (authMeQuery.isError) {
        console.error('Auth Me error:', JSON.stringify(authMeQuery.error))
        if (authMeQuery.error.value.error.code === 'FORBIDDEN') {
          await userManager.revokeTokens()
          await userManager.removeUser()
        }
      }
    }

    handleError()
  }, [authMeQuery])

  const queryClient = useQueryClient()
  useEffect(() => {
    // subscribe to local storage events to sync user state between tabs
    // note that this only triggers for other tabs, not the current one
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && event.key?.startsWith('oidc.user')) {
        queryClient.resetQueries({ queryKey: userQueryOptions.queryKey })
        queryClient.resetQueries({ queryKey: reactQueryClient.getQueryKey('/admin/auth/me', {}) })
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [queryClient])

  const auth = useMemo(() => {
    const user = authMeQuery.data ?? null
    const isAuthenticated = !!user
    return { user, isAuthenticated }
  }, [authMeQuery.data])

  if (userQuery.isLoading || authMeQuery.isLoading) {
    return <SplashScreen />
  }
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export const logout = async () => {
  await userManager.revokeTokens()
  await userManager.removeUser()
  window.location.reload()
}

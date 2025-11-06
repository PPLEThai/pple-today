import React, { useContext, useEffect } from 'react'

import { queryOptions, useQuery } from '@tanstack/react-query'

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
    if (authMeQuery.isError) {
      console.error('Auth Me error:', JSON.stringify(authMeQuery.error))
    }
  }, [authMeQuery])

  if (userQuery.isLoading || authMeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <img src="/pple-icon.svg" />
      </div>
    )
  }
  const user = authMeQuery.data ?? null
  const isAuthenticated = !!user
  const auth = { isAuthenticated, user }
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

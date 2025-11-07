import React, { useEffect, useRef } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { SplashScreen } from 'components/SplashScreen'
import * as z from 'zod/v4'

import { userManager } from '~/config/oidc'
import { useAuthContext, userQueryOptions } from '~/core/auth'
import { reactQueryClient } from '~/libs/api-client'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  code: z.string().optional(),
  state: z.string().optional(),
})
export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect ?? '/dashboard' })
    }
  },
})

function RouteComponent() {
  const search = Route.useSearch()
  const signInRedirectMutation = useMutation({
    mutationFn: () => {
      return userManager.signinRedirect({ url_state: search.redirect })
    },
  })

  const signInMutation = useMutation({
    mutationKey: ['sso', 'signin-callback'],
    mutationFn: () => {
      return userManager.signinCallback()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryOptions.queryKey })
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/admin/auth/me', {}),
      })
    },
    onError: (error) => {
      console.error('SSO sign-in error:', error)
    },
  })

  const userQuery = useQuery({ ...userQueryOptions, enabled: false })
  // prevent double call in React Strict Mode
  // mutation.isPending is not sufficient
  const called = useRef(false)
  useEffect(() => {
    if (!search.code || !search.state || called.current || userQuery.data) {
      return
    }
    called.current = true
    signInMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const auth = useAuthContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!auth.isAuthenticated || !signInMutation.data) {
      return
    }
    navigate({ to: search.redirect ?? '/dashboard' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, signInMutation.data])
  const disabled = signInRedirectMutation.isPending || signInMutation.isPending

  const routerState = useRouterState()
  if (routerState.isLoading) {
    return <SplashScreen />
  }
  return (
    <div className="flex py-16 mx-auto justify-center min-h-screen items-center bg-base-bg-medium">
      <section className="bg-base-bg-white shadow-sm text-card-foreground flex flex-col rounded-3xl border p-6 w-full max-w-[350px] gap-4">
        <img src="/pple-icon.svg" alt="PPLE Today" className="h-12 w-12 mx-auto" />
        <h1 className="text-xl font-regular text-center">PPLE Today Backoffice</h1>
        <Button onClick={() => signInRedirectMutation.mutate()} disabled={disabled}>
          Login with SSO
        </Button>
      </section>
    </div>
  )
}

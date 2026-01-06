import React, { useEffect, useRef } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouterState } from '@tanstack/react-router'
import { SplashScreen } from 'components/SplashScreen'
import * as z from 'zod/v4'

import { userManager } from '~/config/oidc'
import { userQueryOptions } from '~/core/auth'
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

  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const signInMutation = useMutation({
    mutationKey: ['sso', 'signin-callback'],
    mutationFn: async () => {
      await userManager.clearStaleState()
      return await userManager.signinCallback()
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userQueryOptions.queryKey })
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/admin/auth/me', {}),
      })
      navigate({ search: { ...search, redirect: user?.url_state } })
    },
    onError: (error) => {
      console.error('SSO sign-in error:', error)
    },
  })

  const authMeQuery = reactQueryClient.useQuery('/admin/auth/me', {}, { enabled: false })
  const userQuery = useQuery({ ...userQueryOptions, enabled: false })

  // prevent double call in React Strict Mode
  // mutation.isPending is not sufficient
  const called = useRef(false)
  useEffect(() => {
    if (!search.code || !search.state || called.current || userQuery.data) {
      return
    }
    called.current = true
    // Ref: https://github.com/TanStack/query/issues/5341
    setTimeout(() => signInMutation.mutate(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disabled =
    signInRedirectMutation.isPending || (!signInMutation.error?.message && signInMutation.isPending)

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
        {(authMeQuery.isError || signInMutation.error?.message) && (
          <Typography variant="p" fontWeight="bold" className="text-red-600 text-center">
            {authMeQuery.error?.value.error.message || signInMutation.error?.message}
          </Typography>
        )}
      </section>
    </div>
  )
}

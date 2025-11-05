import React, { useEffect } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import * as z from 'zod/v4'

import { userManager } from '~/config/oidc'
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
  const signInQuery = useQuery({
    queryKey: ['oidc', 'signin'],
    queryFn: () => userManager.signinCallback(),
    enabled: !!search.code,
  })
  const navigate = Route.useNavigate()
  useEffect(() => {
    if (signInQuery.isSuccess) {
      queryClient.invalidateQueries({
        queryKey: ['oidc', 'user'],
      })
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/admin/auth/me'),
      })
      navigate({ to: signInQuery.data?.url_state ?? '/dashboard' })
    }
  }, [queryClient, signInQuery, navigate])
  useEffect(() => {
    if (signInQuery.isError) {
      // TODO: handle error
      console.error('SSO sign-in error:', signInQuery.error)
    }
  }, [signInQuery.isError, signInQuery.error])
  const disabled = signInRedirectMutation.isPending || signInQuery.isLoading
  return (
    <div className="flex py-16 mx-auto justify-center min-h-screen items-center bg-base-bg-default">
      <section className="border border-base-outline-default bg-white rounded-2xl p-6 flex flex-col w-[320px]">
        <img src="/pple-icon.svg" alt="PPLE Today" className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-xl font-regular mb-4 text-center">PPLE Today Backoffice</h1>
        <Button onClick={() => signInRedirectMutation.mutate()} disabled={disabled}>
          Login with SSO
        </Button>
      </section>
    </div>
  )
}

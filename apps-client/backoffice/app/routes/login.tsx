import React, { useEffect } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
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
  const navigate = useNavigate()
  useEffect(() => {
    if (signInQuery.data) {
      queryClient.invalidateQueries({
        queryKey: ['oidc', 'user'],
      })
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/admin/auth/me'),
      })
      navigate({ to: signInQuery.data?.url_state ?? '/dashboard' })
    }
  }, [queryClient, signInQuery.data, navigate])
  useEffect(() => {
    if (signInQuery.error) {
      // TODO: handle error
      console.error('SSO sign-in error:', signInQuery.error)
    }
  }, [signInQuery.error])
  const disabled = signInRedirectMutation.isPending || signInQuery.isLoading
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

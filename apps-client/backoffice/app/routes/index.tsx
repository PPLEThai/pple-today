import { createFileRoute, redirect } from '@tanstack/react-router'
import * as z from 'zod'

const indexSearchSchema = z.object({
  redirect: z.string().optional(),
})
export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: indexSearchSchema,
  beforeLoad: async ({ context, search }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
    throw redirect({ to: search.redirect ?? '/dashboard' })
  },
})

function Index() {
  return null
}

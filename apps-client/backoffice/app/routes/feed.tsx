import { createFileRoute } from '@tanstack/react-router'

import AuthLayout from './_auth'

export const Route = createFileRoute('/feed')({
  component: AuthLayout,
})

import { Button } from '@pple-today/web-ui/button'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { AppSidebar } from 'components/AppSidebar'

import { reactQueryClient } from '~/libs/api-client'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

export default function AuthLayout() {
  const query = reactQueryClient.useQuery('/admin/auth/me', {}, { retry: false })

  return query.isLoading ? (
    <div>Loading Auth...</div>
  ) : query.data ? (
    <AppSidebar authMe={query.data}>
      <Outlet />
    </AppSidebar>
  ) : (
    <Button asChild>
      <Link to="/sso">ล็อกอิน</Link>
    </Button>
  )
}

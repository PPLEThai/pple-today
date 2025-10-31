import { NavLink, Outlet } from 'react-router'

import { Button } from '@pple-today/web-ui/button'
import { AppSidebar } from 'components/AppSidebar'

import { reactQueryClient } from '~/libs/api-client'

export default function ActivityLayout() {
  const query = reactQueryClient.useQuery('/admin/auth/me', {}, { retry: false })

  return query.isLoading ? (
    <div>Loading Auth...</div>
  ) : query.data ? (
    <AppSidebar authMe={query.data}>
      <Outlet />
    </AppSidebar>
  ) : (
    <Button asChild>
      <NavLink to="/sso">ล็อกอิน</NavLink>
    </Button>
  )
}

import { Outlet } from 'react-router'

import { AppSidebar } from 'components/AppSidebar'

export default function FeedLayout() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  )
}

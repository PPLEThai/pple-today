import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from 'components/AppSidebar'

export const Route = createFileRoute('/_app')({
  component: AuthLayout,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})

function AuthLayout() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  )
}

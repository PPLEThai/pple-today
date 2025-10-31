import { PropsWithChildren } from 'react'
import { NavLink } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { AppSidebar } from 'components/AppSidebar'

import { reactQueryClient } from '~/libs/api-client'

import { Data } from './data'

export function meta() {
  return [{ title: 'Facebook' }]
}

// FIXME
function Layout({ children }: PropsWithChildren) {
  const query = reactQueryClient.useQuery('/admin/auth/me', {}, { retry: false })

  return query.isLoading ? (
    <div>Loading Auth...</div>
  ) : query.data ? (
    <AppSidebar authMe={query.data}>{children}</AppSidebar>
  ) : (
    <Button asChild>
      <NavLink to="/sso">ล็อกอิน</NavLink>
    </Button>
  )
}

export default function FacebookPage() {
  return (
    <Layout>
      <div className="px-6 pb-6 space-y-2">
        <Breadcrumb className="pt-4 pb-2">
          <BreadcrumbList>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Facebook</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Typography variant="h1">จัดการเพจเฟสบุ๊ค</Typography>
        <Data />
      </div>
    </Layout>
  )
}

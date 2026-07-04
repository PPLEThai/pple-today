import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Typography } from '@pple-today/web-ui/typography'
import { createFileRoute } from '@tanstack/react-router'

import { Data } from './-data'

export const Route = createFileRoute('/_app/mini-app/')({
  component: MiniAppPage,
  head: () => ({ meta: [{ title: 'Mini App' }] }),
})

function MiniAppPage() {
  return (
    <div className="px-6 pb-6 space-y-2">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mini App</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Typography variant="h1">จัดการ Mini App</Typography>
      <Data />
    </div>
  )
}

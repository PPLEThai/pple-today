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

export const Route = createFileRoute('/_app/facebook/')({
  component: FacebookPage,
  head: () => ({ meta: [{ title: 'Facebook' }] }),
})

function FacebookPage() {
  return (
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
  )
}

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Typography } from '@pple-today/web-ui/typography'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Data } from './data'

export const Route = createFileRoute('/feed/topic/')({
  component: TopicPage,
  head: () => ({ meta: [{ title: 'Feed Topic' }] }),
})

function TopicPage() {
  return (
    <div className="px-6 pb-6 space-y-2">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/feed">Feed</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Topic</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Typography variant="h1">จัดการหัวข้อ</Typography>
      <Data />
    </div>
  )
}

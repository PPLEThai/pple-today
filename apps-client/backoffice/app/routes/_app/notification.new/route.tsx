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
import { NotificationComposeForm } from 'components/notification/NotificationComposeForm'

export const Route = createFileRoute('/_app/notification/new')({
  component: NewNotificationPage,
  head: () => ({ meta: [{ title: 'สร้างการแจ้งเตือน' }] }),
})

function NewNotificationPage() {
  return (
    <div className="px-6 pb-6 space-y-4">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/notification">แจ้งเตือน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>สร้างการแจ้งเตือน</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Typography variant="h1">สร้างการแจ้งเตือน</Typography>
      <NotificationComposeForm />
    </div>
  )
}

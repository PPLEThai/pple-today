import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Data } from './-data'

export const Route = createFileRoute('/_app/notification/')({
  component: NotificationPage,
  head: () => ({ meta: [{ title: 'แจ้งเตือน' }] }),
})

function NotificationPage() {
  return (
    <div className="px-6 pb-6 space-y-2">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>แจ้งเตือน</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-4">
        <Typography variant="h1" className="mr-auto">
          แจ้งเตือน
        </Typography>
        <Button className="gap-2" asChild>
          <Link to="/notification/new">
            <Plus />
            สร้างการแจ้งเตือน
          </Link>
        </Button>
      </div>
      <p className="text-sm text-base-text-medium">
        การแจ้งเตือนที่ส่งจากหน้านี้ในนาม PPLE Today (ไม่รวมการแจ้งเตือนที่ Mini App ส่งผ่าน API)
      </p>
      <Data />
    </div>
  )
}

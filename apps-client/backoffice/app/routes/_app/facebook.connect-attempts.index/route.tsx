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
import { FacebookConnectAttemptTable } from 'components/facebook/FacebookConnectAttempts'

import { FailureSummary } from './-summary'

export const Route = createFileRoute('/_app/facebook/connect-attempts/')({
  component: FacebookConnectAttemptsPage,
  head: () => ({ meta: [{ title: 'ประวัติการเชื่อมต่อเพจ Facebook' }] }),
})

function FacebookConnectAttemptsPage() {
  return (
    <div className="px-6 pb-6 space-y-4">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/facebook">Facebook</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ประวัติการเชื่อมต่อ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-1">
        <Typography variant="h1">ประวัติการเชื่อมต่อเพจ Facebook</Typography>
        <p className="text-sm text-base-text-medium">
          ทุกครั้งที่ผู้ใช้กด “เพิ่มเพจที่ดูแล” ในแอป ค้นหาด้วยรหัสอ้างอิงจากภาพหน้าจอของผู้ใช้
          หรือชื่อ / เบอร์โทร
        </p>
      </div>
      <FailureSummary />
      <FacebookConnectAttemptTable />
    </div>
  )
}

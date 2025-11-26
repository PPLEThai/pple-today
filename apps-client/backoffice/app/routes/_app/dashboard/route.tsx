import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardBaseCard } from 'components/dashboard/DashboardBaseCard'
import { DashboardProvinceCountList } from 'components/dashboard/DashboardProvinceCountList'
import { DashboardStatCard } from 'components/dashboard/DashboardStatCard'
import {
  FilePlus,
  HeartHandshake,
  MapPinned,
  MessageCirclePlus,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import { reactQueryClient } from '~/libs/api-client'

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
})
function Dashboard() {
  const query = reactQueryClient.useQuery(
    '/admin/dashboard',
    {},
    {
      placeholderData: keepPreviousData,
    }
  )

  return (
    <div className="flex flex-col px-6 pb-6 gap-4 h-svh">
      <Breadcrumb className="pt-4">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Typography variant="h1">แดชบอร์ด</Typography>
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="grid grid-cols-2 grid-rows-2 gap-4">
          <DashboardStatCard
            title="ผู้ใช้งานทั้งหมด"
            icon={Users}
            displayValue={
              (query.data?.users.today ?? 0) +
              (query.data?.users.yesterday ?? 0) +
              (query.data?.users.previousYesterday ?? 0)
            }
            trendNewValue={
              (query.data?.users.today ?? 0) +
              (query.data?.users.yesterday ?? 0) +
              (query.data?.users.previousYesterday ?? 0)
            }
            trendOldValue={
              (query.data?.users.yesterday ?? 0) + (query.data?.users.previousYesterday ?? 0)
            }
            isLoading={query.isLoading}
          />
          <div className="grid grid-cols-2 gap-4">
            <DashboardStatCard
              title="ผู้ใช้งานใหม่ต่อวัน"
              icon={UserPlus}
              displayValue={query.data?.users.today ?? 0}
              trendNewValue={query.data?.users.today ?? 0}
              trendOldValue={query.data?.users.yesterday ?? 0}
              isLoading={query.isLoading}
            />
            <DashboardStatCard
              title="จำนวนโพสต์ใหม่ต่อวัน"
              icon={FilePlus}
              displayValue={query.data?.posts.today ?? 0}
              trendNewValue={query.data?.posts.today ?? 0}
              trendOldValue={query.data?.posts.yesterday ?? 0}
              isLoading={query.isLoading}
            />
          </div>
          <DashboardStatCard
            title="สมาชิกพรรคทั้งหมด"
            icon={UserCheck}
            displayValue={
              (query.data?.members.today ?? 0) +
              (query.data?.members.yesterday ?? 0) +
              (query.data?.members.previousYesterday ?? 0)
            }
            trendNewValue={
              (query.data?.members.today ?? 0) +
              (query.data?.members.yesterday ?? 0) +
              (query.data?.members.previousYesterday ?? 0)
            }
            trendOldValue={
              (query.data?.members.yesterday ?? 0) + (query.data?.members.previousYesterday ?? 0)
            }
            isLoading={query.isLoading}
          />
          <div className="grid grid-cols-2 gap-4">
            <DashboardStatCard
              title="คอมเมนต์ต่อวัน"
              icon={MessageCirclePlus}
              displayValue={query.data?.comments.today ?? 0}
              trendNewValue={query.data?.comments.today ?? 0}
              trendOldValue={query.data?.comments.yesterday ?? 0}
              isLoading={query.isLoading}
            />
            <DashboardStatCard
              title="การกดไลค์ต่อวัน"
              icon={HeartHandshake}
              displayValue={query.data?.likes.today ?? 0}
              trendNewValue={query.data?.likes.today ?? 0}
              trendOldValue={query.data?.likes.yesterday ?? 0}
              isLoading={query.isLoading}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex gap-4">
          <DashboardBaseCard
            className="flex-1 min-w-0"
            title="สมาชิกพรรคในแต่ละจังหวัด"
            icon={MapPinned}
          >
            <DashboardProvinceCountList data={query.data?.memberPerProvince ?? {}} />
          </DashboardBaseCard>
          <DashboardBaseCard
            className="flex-1 min-w-0"
            title="ผู้ใช้งานในแต่ละจังหวัด"
            icon={MapPinned}
          >
            <DashboardProvinceCountList data={query.data?.userPerProvince ?? {}} />
          </DashboardBaseCard>
        </div>
      </div>
    </div>
  )
}

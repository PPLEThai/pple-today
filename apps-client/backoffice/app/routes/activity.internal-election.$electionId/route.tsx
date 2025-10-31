import { NavLink } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { Eye, Pencil, Trash2, Vote } from 'lucide-react'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from '.react-router/types/app/+types/root'

export function Mmeta() {
  return [{ title: 'Internal-election' }]
}

export default function InternalElectionDetailPage({ params }: Route.LoaderArgs) {
  const { electionId } = params
  const query = reactQueryClient.useQuery('/admin/elections/:electionId', {
    pathParams: { electionId: electionId || '' },
  })

  return (
    <div className="mx-6">
      <ElectionBreadcrumb name={query.data?.name || '-'} />
      <Header />
    </div>
  )
}

function ElectionBreadcrumb({ name }: { name: string }) {
  return (
    <Breadcrumb className="mt-4">
      <BreadcrumbList>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <NavLink to="/activity">Activity</NavLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <NavLink to="/activity/internal-election">Internal Election</NavLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function Header() {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-4">
        <Vote />
        <Typography variant="h1">รายละเอียดการเลือกตั้ง</Typography>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon">
          <Trash2 />
        </Button>
        <Button variant="default" size="icon">
          <Eye className="text-white" />
        </Button>
        <Button variant="default" className="space-x-2">
          <Pencil className="text-white" />
          <Typography variant="small" className="text-white">
            แก้ไขการเลือกตั้ง
          </Typography>
        </Button>
      </div>
    </div>
  )
}

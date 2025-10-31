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
import { Card, CardContent } from '@pple-today/web-ui/card'
import { Typography } from '@pple-today/web-ui/typography'
import {
  Calendar,
  Download,
  Eye,
  Link,
  MapPin,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
  Vote,
} from 'lucide-react'
import { AdminGetElectionResponse } from 'node_modules/@api/backoffice/src/modules/admin/election/models'
import { getTimelineString } from 'utils/date'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from '.react-router/types/app/+types/root'
import ElectionTypeBadge from 'components/election/ElectionTypeBadge'
import ElectionStatusBadge from 'components/election/ElectionStatusBadge'
import ElectionKeyStatusBadge from 'components/election/ElectionKeyStatusBadge'

export function Mmeta() {
  return [{ title: 'Internal-election' }]
}

export default function InternalElectionDetailPage({ params }: Route.LoaderArgs) {
  const { electionId } = params
  const query = reactQueryClient.useQuery('/admin/elections/:electionId', {
    pathParams: { electionId: electionId || '' },
  })

  return (
    <div className="mx-6 space-y-4">
      <ElectionBreadcrumb name={query.data?.name || '-'} />
      <Header />
      {query.isSuccess && <ElectionDetail election={query.data} />}
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

function ElectionDetail({ election }: { election: AdminGetElectionResponse }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-secondary-200">
          <Link className="mr-2 " />
          <Typography variant="p" className="mr-2 text-secondary-200">
            ID:
          </Typography>
          <Typography variant="p" className="text-primary">
            {election.id}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          {election.status === 'DRAFT' && (
            <>
              {election.keyStatus === 'FAILED_CREATED' && (
                <Button variant="outline" size="icon">
                  <RefreshCw className="text-secondary-200" />
                </Button>
              )}
              <ElectionKeyStatusBadge status={election.keyStatus} />
            </>
          )}
          <ElectionTypeBadge type={election.type} />
          <ElectionStatusBadge status={election.status} />
        </div>
      </div>
      <Typography variant="h2">เลือกตั้งผู้แทนเขต</Typography>
      <CardContent>
        <div className="flex flex-col gap-4 text-secondary-200">
          <div className="flex items-center gap-2">
            <MapPin />
            <Typography variant="small" className="text-secondary-200">
              อำเภอ/เขต: ลาดพร้าว จังหวัด: กรุงเทพมหานคร
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Calendar />
            <Typography variant="small" className="text-secondary-200">
              ช่วงเวลาลงคะแนน:{' '}
              {getTimelineString(new Date(election.openVoting), new Date(election.closeVoting))}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Users />
            <Typography variant="small" className="text-secondary-200">
              ผู้มีสิทธิ์เลือกตั้ง: {election.totalVoters} คน
            </Typography>
          </div>
        </div>
        <Typography variant="large" className="mt-4">
          จำนวนลงคะแนน
        </Typography>
        <div className="flex items-center justify-between">
          <Typography variant="large" className="text-primary">
            {election.totalVoters} คน
          </Typography>
          <Button variant="secondary">
            <Download className="mr-2" />
            <Typography variant="small">รายชื่อผู้มีสิทธิ์เลือกตั้ง</Typography>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

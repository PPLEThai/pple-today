import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Switch } from '@pple-today/web-ui/switch'
import { Typography } from '@pple-today/web-ui/typography'
import { ColumnDef } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'

import { GetHashtagsResponse } from '@api/backoffice/admin'

export function meta() {
  return [{ title: 'Hashtag' }, { name: 'description', content: 'Welcome to React Router!' }]
}

const EXAMPLE_HASHTAG_COLUMNS: ColumnDef<GetHashtagsResponse[number]>[] = [
  {
    accessorKey: 'id',
    header: () => <div className="pl-2">ID</div>,
    cell: ({ row }) => <TableCopyId id={row.getValue('id')} />,
  },
  {
    accessorKey: 'status',
    header: 'สถานะ',
    cell: ({ row }) => {
      const status = row.getValue<GetHashtagsResponse[number]['status']>('status')
      if (status === 'PUBLISH') return <Badge variant="success">เปิดใช้งาน</Badge>
      return <Badge variant="destructive">ระงับการใช้งาน</Badge>
    },
  },
  { accessorKey: 'name', header: 'ชื่อ Hashtag' },
  { header: 'เปิดใช้งาน', cell: () => <Switch /> },
]

const EXAMPLE_DATE = new Date()

const EXAMPLE_DATA: GetHashtagsResponse = [
  {
    id: '0',
    status: 'PUBLISH',
    name: 'ชัยชนะ',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '1',
    status: 'SUSPEND',
    name: 'การเมืองเพื่อประชาชน',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '2',
    status: 'PUBLISH',
    name: 'เสียงของประชาชน',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '3',
    status: 'PUBLISH',
    name: 'พลังประชาชน',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '4',
    status: 'PUBLISH',
    name: 'เราต้องการการเปลี่ยนแปลง',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '5',
    status: 'PUBLISH',
    name: 'อนาคตที่ดีสำหรับเด็ก',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '6',
    status: 'PUBLISH',
    name: 'ความยุติธรรมทางสังคม',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '7',
    status: 'SUSPEND',
    name: 'เสียงที่ไม่ถูกได้ยิน',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '8',
    status: 'SUSPEND',
    name: 'สร้างสรรค์ประชาธิปไตย',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
  {
    id: '9',
    status: 'SUSPEND',
    name: 'การมีส่วนร่วมของทุกคน',
    createdAt: EXAMPLE_DATE,
    updatedAt: EXAMPLE_DATE,
  },
]

export default function HashtagPage() {
  return (
    <div className="px-6 space-y-2">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/feed">Feed</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Hashtag</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Typography variant="h1">จัดการแฮชแท็ก</Typography>
      <DataTable
        columns={EXAMPLE_HASHTAG_COLUMNS}
        data={EXAMPLE_DATA}
        filter={[{ type: 'text', key: 'name', label: 'ค้นหาแฮชแท็ก' }]}
      />
    </div>
  )
}

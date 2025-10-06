'use client'

import { useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'
import { Megaphone, Pencil, Trash2 } from 'lucide-react'

import { GetTopicsResponse } from '@api/backoffice/admin'

const columnHelper = createColumnHelper<GetTopicsResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'id',
        header: () => <div className="pl-2">ID</div>,
        cell: () => <TableCopyId id="1" />,
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.display({
        id: 'image',
        header: 'รูป',
        cell: () => {
          return (
            <img
              className="size-10 rounded-lg"
              src="https://picsum.photos/id/40/40"
              alt=""
              width={40}
              height={40}
            />
          )
        },
        size: 72,
        minSize: 72,
        maxSize: 72,
      }),
      columnHelper.display({
        id: 'name',
        header: 'ข้อความพาดหัว',
        cell: 'อนาคตที่ดีสำหรับเด็ก',
      }),
      columnHelper.display({
        id: 'status',
        header: 'สถานะ',
        cell: () => <Badge variant="success">ประกาศแล้ว</Badge>,
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'displayRange',
        header: 'ช่วงเวลาที่แสดง',
        cell: () => {
          const START_DATE = new Date()
          const END_DATE = new Date()

          const startDateString = START_DATE.toLocaleDateString('th', {
            dateStyle: 'short',
          })
          const endDateString = END_DATE.toLocaleDateString('th', {
            dateStyle: 'short',
          })

          return `${startDateString} - ${endDateString}`
        },
        size: 159,
        minSize: 159,
      }),
      columnHelper.display({
        id: 'category',
        header: 'ประเภท',
        cell: () => <Badge>Mini - app</Badge>,
        size: 111,
        minSize: 111,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.getValue<GetTopicsResponse['data'][number]['id']>('id')
          return (
            <>
              <div className="flex gap-3">
                <Button size="icon" className="size-8" asChild>
                  <NavLink to={`/feed/topic/${id}`}>
                    <span className="sr-only">ประกาศ</span>
                    <Megaphone className="size-4" />
                  </NavLink>
                </Button>
                {/* <Button variant="secondary" size="icon" className="size-8" asChild>
                  <NavLink to={`/feed/topic/${id}`}>
                    <span className="sr-only">เก็บในคลัง</span>
                    <EyeOff className="size-4" />
                  </NavLink>
                </Button> */}
                <Button variant="outline" size="icon" className="size-8" asChild>
                  <NavLink to={`/feed/topic/${id}`}>
                    <span className="sr-only">แก้ไข</span>
                    <Pencil className="size-4" />
                  </NavLink>
                </Button>
                <Button variant="outline-destructive" size="icon" className="size-8" asChild>
                  <NavLink to={`/feed/topic/${id}`}>
                    <span className="sr-only">ลบ</span>
                    <Trash2 className="size-4" />
                  </NavLink>
                </Button>
              </div>
            </>
          )
        },
        size: 152,
        minSize: 152,
        maxSize: 152,
      }),
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={Array(10).fill({})}
      count={10}
      isQuerying={false}
      isMutating={false}
      queryLimit={queryLimit}
      setQueryLimit={setQueryLimit}
      queryPage={queryPage}
      setQueryPage={setQueryPage}
      filter={[
        {
          type: 'text',
          key: 'name',
          label: 'ค้นหาแบนเนอร์',
          state: querySearch,
          setState: setQuerySearch,
        },
        {
          type: 'enum',
          key: 'status',
          label: 'สถานะ',
          options: [
            { label: 'ประกาศแล้ว', value: 'PUBLISH' },
            { label: 'ร่าง', value: 'DRAFT' },
            { label: 'เก็บในคลัง', value: 'ARCHIVE' },
          ],
          state: queryStatus,
          setState: setQueryStatus,
        },
      ]}
    />
  )
}

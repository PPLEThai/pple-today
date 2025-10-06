'use client'

import { useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { createColumnHelper } from '@tanstack/react-table'
import { Engagements } from 'components/Engagements'
import { TableCopyId } from 'components/TableCopyId'
import { Megaphone, Trash2 } from 'lucide-react'

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
        id: 'name',
        header: 'เนื้อหา',
        cell: '123',
      }),
      columnHelper.display({
        id: 'engagements',
        header: 'การมีส่วนร่วม',
        cell: () => {
          const LIKES = 120
          const DISLIKES = 240
          const COMMENTS = 230
          return <Engagements likes={LIKES} dislikes={DISLIKES} comments={COMMENTS} />
        },
        size: 194,
        minSize: 194,
      }),
      columnHelper.display({
        id: 'status',
        header: 'สถานะ',
        cell: () => <Badge variant="success">ประกาศแล้ว</Badge>,
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'publishDate',
        header: 'วันที่ประกาศ',
        cell: () => {
          const DATE = new Date()

          return DATE.toLocaleDateString('th', {
            dateStyle: 'short',
          })
        },
        size: 103,
        minSize: 103,
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
        size: 108,
        minSize: 108,
        maxSize: 108,
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
          label: 'ค้นหาโพสต์',
          state: querySearch,
          setState: setQuerySearch,
        },
        {
          type: 'enum',
          key: 'status',
          label: 'สถานะ',
          options: [
            { label: 'ประกาศแล้ว', value: 'PUBLISH' },
            { label: 'ซ่อน', value: 'HIDE' },
            { label: 'ลบแล้ว', value: 'DELETE' },
          ],
          state: queryStatus,
          setState: setQueryStatus,
        },
      ]}
    />
  )
}

'use client'

import { useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { Engagements } from 'components/Engagements'
import { TableCopyId } from 'components/TableCopyId'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'

import { GetAnnouncementsResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const ANNOUNCEMENT_TYPE_DISPLAY_TEXT = {
  OFFICIAL: 'ทางการ',
  PARTY_COMMUNICATE: 'สื่อสารพรรค',
  INTERNAL: 'ภายใน',
} as const

const columnHelper = createColumnHelper<GetAnnouncementsResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const query = reactQueryClient.useQuery(
    '/admin/announcements',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch,
        status:
          queryStatus.length > 0
            ? (queryStatus as ('PUBLISHED' | 'ARCHIVED' | 'DRAFT')[])
            : undefined,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => <div className="pl-2">ID</div>,
        cell: (info) => <TableCopyId id={info.getValue()} />,
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.accessor('title', {
        header: 'ชื่อประกาศ',
      }),
      columnHelper.display({
        id: 'engagements',
        header: 'การมีส่วนร่วม',
        cell: ({ row }) => {
          const reactionCounts = row.original.reactionCounts
          const commentsCount = row.original.commentsCount

          const upVotes = reactionCounts.find((r) => r.type === 'UP_VOTE')?.count ?? 0
          const downVotes = reactionCounts.find((r) => r.type === 'DOWN_VOTE')?.count ?? 0

          return <Engagements likes={upVotes} dislikes={downVotes} comments={commentsCount} />
        },
        size: 194,
        minSize: 194,
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'PUBLISHED') return <Badge variant="success">ประกาศแล้ว</Badge>
          if (status === 'ARCHIVED') return <Badge variant="secondary">เก็บในคลัง</Badge>
          return <Badge variant="outline">ร่าง</Badge>
        },
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('publishedAt', {
        header: 'วันที่ประกาศ',
        cell: (info) => {
          const publishedAt = info.getValue()
          if (!publishedAt) return '-'
          return new Date(publishedAt).toLocaleDateString('th', {
            dateStyle: 'short',
          })
        },
        size: 103,
        minSize: 103,
      }),
      columnHelper.accessor('type', {
        header: 'ประเภท',
        cell: (info) => <Badge>{ANNOUNCEMENT_TYPE_DISPLAY_TEXT[info.getValue()]}</Badge>,
        size: 114,
        minSize: 114,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.getValue<GetAnnouncementsResponse['data'][number]['id']>('id')
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
      data={query.data?.data ?? []}
      count={query.data?.meta.count ?? 0}
      isQuerying={query.isLoading}
      isMutating={false}
      queryLimit={queryLimit}
      setQueryLimit={setQueryLimit}
      queryPage={queryPage}
      setQueryPage={setQueryPage}
      filter={[
        {
          type: 'text',
          key: 'name',
          label: 'ค้นหาประกาศ',
          state: querySearch,
          setState: setQuerySearch,
        },
        {
          type: 'enum',
          key: 'status',
          label: 'สถานะ',
          options: [
            { label: 'ประกาศแล้ว', value: 'PUBLISHED' },
            { label: 'เก็บในคลัง', value: 'ARCHIVED' },
            { label: 'ร่าง', value: 'DRAFT' },
          ],
          state: queryStatus,
          setState: setQueryStatus,
        },
      ]}
      filterExtension={
        <Button asChild>
          <NavLink to="/feed/announcement/create">
            <Plus />
            สร้างประกาศ
          </NavLink>
        </Button>
      }
    />
  )
}

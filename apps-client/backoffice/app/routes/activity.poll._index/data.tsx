'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { Engagements } from 'components/Engagements'
import { TableCopyId } from 'components/TableCopyId'
import dayjs from 'dayjs'
import { EyeOff, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  DeletePollParams,
  GetPollsResponse,
  UpdatePollBody,
  UpdatePollParams,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'
import { exhaustiveGuard } from '~/libs/exhaustive-guard'

function getPollStatus(poll: GetPollsResponse['data'][number]) {
  switch (poll.status) {
    case 'PUBLISHED':
      if (dayjs(new Date()).isAfter(poll.endAt)) {
        return 'PUBLISHED_ENDED'
      } else {
        return 'PUBLISHED_ONGOING'
      }
    case 'ARCHIVED':
      return 'ARCHIVED'
    case 'DRAFT':
      return 'DRAFT'
    default:
      exhaustiveGuard(poll.status)
  }
}

const columnHelper = createColumnHelper<GetPollsResponse['data'][number]>()

export const Data = () => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/polls',
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
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/polls/:pollId')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/polls/:pollId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/polls', {
        query: {
          limit: queryLimit,
          page: queryPage,
          search: querySearch,
          status:
            queryStatus.length > 0
              ? (queryStatus as ('PUBLISHED' | 'ARCHIVED' | 'DRAFT')[])
              : undefined,
        },
      }),
    })
  }, [queryClient, queryLimit, queryPage, querySearch, queryStatus])

  const setPollStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdatePollBody['status']> },
      { pollId }: UpdatePollParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { pollId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/polls', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch,
                  status:
                    queryStatus.length > 0
                      ? (queryStatus as ('PUBLISHED' | 'ARCHIVED' | 'DRAFT')[])
                      : undefined,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === pollId)
                if (idx === -1) return
                data.data[idx].status = status
                if (status === 'PUBLISHED') data.data[idx].publishedAt = new Date()
                return data
              }
            )
          },
        }
      )
    },
    [patchMutation, queryClient, queryLimit, queryPage, querySearch, queryStatus]
  )

  const deletePoll = useCallback(
    (pollId: DeletePollParams['pollId']) => {
      deleteMutation.mutateAsync({ pathParams: { pollId } }, { onSuccess: () => invalidateQuery() })
    },
    [deleteMutation, invalidateQuery]
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
        header: 'ชื่อ',
        cell: (info) => (
          <NavLink className="hover:underline" to={`/activity/poll/${info.row.original.id}`}>
            {info.getValue()}
          </NavLink>
        ),
      }),
      columnHelper.display({
        id: 'engagements',
        header: 'การมีส่วนร่วม',
        cell: ({ row }) => {
          const reactionCounts = row.original.reactions
          const commentsCount = row.original.commentCount

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
          const status = getPollStatus(info.row.original)
          switch (status) {
            case 'PUBLISHED_ONGOING':
              return <Badge variant={'success'}>ประกาศแล้ว</Badge>
            case 'PUBLISHED_ENDED':
              return <Badge variant={'closed'}>ปิดโพลแล้ว</Badge>
            case 'ARCHIVED':
              return <Badge variant={'secondary'}>เก็บในคลัง</Badge>
            case 'DRAFT':
              return <Badge variant={'outline'}>ร่าง</Badge>
            default:
              exhaustiveGuard(status)
          }
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
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.original.id
          const title = row.original.title
          const status = row.original.status

          return (
            <div className="flex gap-3 justify-end">
              {status === 'PUBLISHED' && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setPollStatus({ status: 'ARCHIVED' }, { pollId: id })}
                >
                  <span className="sr-only">เก็บในคลัง</span>
                  <EyeOff className="size-4" />
                </Button>
              )}
              {status === 'DRAFT' && (
                <Button
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setPollStatus({ status: 'PUBLISHED' }, { pollId: id })}
                >
                  <span className="sr-only">ประกาศ</span>
                  <Megaphone className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <NavLink to={`/activity/poll/${id}`}>
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </NavLink>
              </Button>
              <Button
                variant="outline-destructive"
                size="icon"
                className="size-8"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() => {
                  confirmDialogRef.current?.confirm({
                    title: `ต้องการลบแบบสอบถาม "${title}" หรือไม่?`,
                    description: 'เมื่อลบแบบสอบถามนี้แล้วจะไม่สามารถกู้คืนได้อีก',
                    onConfirm: () => deletePoll(id),
                  })
                }}
              >
                <span className="sr-only">ลบ</span>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        },
        size: 152,
        minSize: 152,
        maxSize: 152,
      }),
    ],
    [deleteMutation.isPending, deletePoll, patchMutation.isPending, setPollStatus]
  )

  return (
    <>
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
              { label: 'โพลที่ประกาศแล้ว', value: 'PUBLISHED' },
              { label: 'โพลที่เก็บในคลัง', value: 'ARCHIVED' },
              { label: 'โพลที่ร่าง', value: 'DRAFT' },
            ],
            state: queryStatus,
            setState: setQueryStatus,
          },
        ]}
        filterExtension={
          <Button>
            <Plus />
            สร้างแบบสอบถาม
          </Button>
        }
      />
      <ConfirmDialog ref={confirmDialogRef} />
    </>
  )
}

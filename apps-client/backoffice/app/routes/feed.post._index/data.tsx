'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtFilter } from 'components/datatable/DtFilter'
import { DtMovement } from 'components/datatable/DtMovement'
import { Engagements } from 'components/Engagements'
import { TableCopyId } from 'components/TableCopyId'
import { EyeOff, Megaphone, Trash2 } from 'lucide-react'

import {
  DeletePostParams,
  GetPostsResponse,
  UpdatePostBody,
  UpdatePostParams,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<GetPostsResponse['items'][number]>()

export const Data = (props: { authorId?: string }) => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/posts',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch,
        status:
          queryStatus.length > 0
            ? (queryStatus as ('PUBLISHED' | 'HIDDEN' | 'DELETED')[])
            : undefined,
        authorId: props.authorId,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/posts/:postId')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/posts/:postId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/posts', {
        query: {
          limit: queryLimit,
          page: queryPage,
          search: querySearch,
          status:
            queryStatus.length > 0
              ? (queryStatus as ('PUBLISHED' | 'HIDDEN' | 'DELETED')[])
              : undefined,
          authorId: props.authorId,
        },
      }),
    })
  }, [props.authorId, queryClient, queryLimit, queryPage, querySearch, queryStatus])

  const setPostStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdatePostBody['status']> },
      { postId }: UpdatePostParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { postId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/posts', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch,
                  status:
                    queryStatus.length > 0
                      ? (queryStatus as ('PUBLISHED' | 'HIDDEN' | 'DELETED')[])
                      : undefined,
                  authorId: props.authorId,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.items.findIndex((d) => d.id === postId)
                if (idx === -1) return
                data.items[idx].status = status
                if (status === 'PUBLISHED') data.items[idx].publishedAt = new Date()
                return data
              }
            )
          },
        }
      )
    },
    [patchMutation, props.authorId, queryClient, queryLimit, queryPage, querySearch, queryStatus]
  )
  const deletePost = useCallback(
    (postId: DeletePostParams['postId']) => {
      deleteMutation.mutateAsync({ pathParams: { postId } }, { onSuccess: () => invalidateQuery() })
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
      columnHelper.accessor('content', {
        header: 'เนื้อหา',
        cell: (info) => (
          <NavLink className="hover:underline" to={`/feed/post/${info.row.original.id}`}>
            {info.getValue()}
          </NavLink>
        ),
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
          if (status === 'HIDDEN') return <Badge variant="secondary">ซ่อน</Badge>
          if (status === 'DELETED') return <Badge variant="destructive">ลบแล้ว</Badge>
          return <Badge variant="success">ประกาศแล้ว</Badge>
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
          const status = row.original.status

          return (
            status !== 'DELETED' && (
              <div className="flex gap-3">
                {status === 'PUBLISHED' ? (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    disabled={patchMutation.isPending}
                    aria-busy={patchMutation.isPending}
                    onClick={() => setPostStatus({ status: 'HIDDEN' }, { postId: id })}
                  >
                    <span className="sr-only">ซ่อน</span>
                    <EyeOff className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="size-8"
                    disabled={patchMutation.isPending}
                    aria-busy={patchMutation.isPending}
                    onClick={() => setPostStatus({ status: 'PUBLISHED' }, { postId: id })}
                  >
                    <span className="sr-only">ประกาศ</span>
                    <Megaphone className="size-4" />
                  </Button>
                )}
                <Button
                  variant="outline-destructive"
                  size="icon"
                  className="size-8"
                  disabled={deleteMutation.isPending}
                  aria-busy={deleteMutation.isPending}
                  onClick={() => {
                    confirmDialogRef.current?.confirm({
                      title: `ต้องการลบโพสต์หรือไม่?`,
                      description: 'เมื่อลบโพสต์แล้วจะไม่สามารถกู้คืนได้อีก',
                      onConfirm: () => deletePost(id),
                    })
                  }}
                >
                  <span className="sr-only">ลบ</span>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          )
        },
        size: 108,
        minSize: 108,
        maxSize: 108,
      }),
    ],
    [deleteMutation.isPending, deletePost, patchMutation.isPending, setPostStatus]
  )

  return (
    <>
      <DtFilter
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
              { label: 'ประกาศแล้ว', value: 'PUBLISHED' },
              { label: 'ซ่อน', value: 'HIDDEN' },
              { label: 'ลบแล้ว', value: 'DELETED' },
            ],
            state: queryStatus,
            setState: setQueryStatus,
          },
        ]}
        onChange={() => setQueryPage(1)}
      />
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isQuerying={query.isLoading}
        footerExtension={
          <DtMovement
            length={query.data?.items?.length ?? 0}
            count={query.data?.meta.count ?? 0}
            isQuerying={query.isLoading}
            isMutating={patchMutation.isPending || deleteMutation.isPending}
            queryLimit={queryLimit}
            setQueryLimit={setQueryLimit}
            queryPage={queryPage}
            setQueryPage={setQueryPage}
          />
        }
      />
      <ConfirmDialog ref={confirmDialogRef} />
    </>
  )
}

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
import { TableCopyId } from 'components/TableCopyId'
import { Check, EyeOff, Pencil, X } from 'lucide-react'
import { GetFacebookPagesResponse } from 'node_modules/@api/backoffice/src/modules/admin/facebook/models'

import { UpdatePostBody, UpdatePostParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<GetFacebookPagesResponse['items'][number]>()

export const Data = () => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/facebook',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch,
        status:
          queryStatus.length > 0
            ? (queryStatus as ('PENDING' | 'APPROVED' | 'REJECTED' | 'UNLINKED')[])
            : undefined,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/posts/:postId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/facebook', {
        query: {
          limit: queryLimit,
          page: queryPage,
          search: querySearch,
          status:
            queryStatus.length > 0
              ? (queryStatus as ('PENDING' | 'APPROVED' | 'REJECTED' | 'UNLINKED')[])
              : undefined,
        },
      }),
    })
  }, [queryClient, queryLimit, queryPage, querySearch, queryStatus])

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
    [patchMutation, queryClient, queryLimit, queryPage, querySearch, queryStatus]
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
      columnHelper.accessor('name', {
        header: 'ชื่อเพจ',
        cell: (info) => (
          <NavLink className="hover:underline" to={`/facebook/${info.row.original.id}`}>
            {info.getValue()}
          </NavLink>
        ),
      }),
      columnHelper.accessor('numberOfFollowers', {
        header: 'ยอดผู้ติดตาม',
        cell: (info) => {
          const count = info.getValue()
          if (count === undefined) return '-'
          return `${count.toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })} คน`
        },
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('linkedStatus', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'UNLINKED') return <Badge className="bg-base-bg-invert">ลบโดยผู้ใช้</Badge>
          if (status === 'APPROVED') return <Badge variant="success">อนุมัติ</Badge>
          if (status === 'REJECTED') return <Badge variant="destructive">ไม่อนุมัติ</Badge>
          if (status === 'SUSPENDED') return <Badge variant="secondary">ถูกระงับ</Badge>
          return <Badge variant="outline">รอการอนุมัติ</Badge>
        },
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.original.id
          const status = row.original.linkedStatus

          return (
            <div className="flex gap-3">
              {status === 'PENDING' && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    disabled={patchMutation.isPending}
                    aria-busy={patchMutation.isPending}
                    onClick={() => setPostStatus({ status: 'HIDDEN' }, { postId: id })}
                  >
                    <span className="sr-only">อนุมัติ</span>
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    disabled={patchMutation.isPending}
                    aria-busy={patchMutation.isPending}
                    onClick={() => setPostStatus({ status: 'HIDDEN' }, { postId: id })}
                  >
                    <span className="sr-only">ไม่อนุมัติ</span>
                    <X className="size-4" />
                  </Button>
                </>
              )}
              {status === 'APPROVED' && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setPostStatus({ status: 'HIDDEN' }, { postId: id })}
                >
                  <span className="sr-only">ระงับการใช้งาน</span>
                  <EyeOff className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <NavLink to={`/facebook/${id}`}>
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </NavLink>
              </Button>
            </div>
          )
        },
        size: 108,
        minSize: 108,
        maxSize: 108,
      }),
    ],
    [patchMutation.isPending, setPostStatus]
  )

  return (
    <>
      <DtFilter
        filter={[
          {
            type: 'text',
            key: 'name',
            label: 'ค้นหาเพจ',
            state: querySearch,
            setState: setQuerySearch,
          },
          {
            type: 'enum',
            key: 'status',
            label: 'สถานะ',
            options: [
              { label: 'รอการอนุมัติ', value: 'PENDING' },
              { label: 'อนุมัติ', value: 'APPROVED' },
              { label: 'ไม่อนุมัติ', value: 'REJECTED' },
              { label: 'ลบโดยผู้ใช้', value: 'UNLINKED' },
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
            isMutating={patchMutation.isPending}
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

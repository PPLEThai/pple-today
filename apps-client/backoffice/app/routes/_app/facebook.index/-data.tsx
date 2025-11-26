'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtFilter } from 'components/datatable/DtFilter'
import { DtMovement } from 'components/datatable/DtMovement'
import { Check, Eye, EyeOff, Pencil, X } from 'lucide-react'

import {
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
  UpdateFacebookPageParams,
} from '@api/backoffice/admin'

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
            ? (queryStatus as ('PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'UNLINKED')[])
            : undefined,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/facebook/:facebookPageId')

  const setFacebookPageStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateFacebookPageBody['status']> },
      { facebookPageId }: UpdateFacebookPageParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { facebookPageId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/facebook', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch,
                  status:
                    queryStatus.length > 0
                      ? (queryStatus as (
                          | 'PENDING'
                          | 'APPROVED'
                          | 'REJECTED'
                          | 'SUSPENDED'
                          | 'UNLINKED'
                        )[])
                      : undefined,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.items.findIndex((d) => d.id === facebookPageId)
                if (idx === -1) return
                data.items[idx].linkedStatus = status
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
      columnHelper.accessor('name', {
        header: () => <div className="pl-2">ชื่อเพจ</div>,
        cell: (info) => (
          <Link
            className="hover:underline"
            to="/facebook/$facebookPageId"
            params={{ facebookPageId: info.row.original.id }}
          >
            {info.getValue()}
          </Link>
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
          switch (status) {
            case 'UNLINKED':
              return <Badge className="bg-base-bg-invert">ลบโดยผู้ใช้</Badge>
            case 'APPROVED':
              return <Badge variant="success">อนุมัติ</Badge>
            case 'REJECTED':
              return <Badge variant="destructive">ไม่อนุมัติ</Badge>
            case 'SUSPENDED':
              return <Badge variant="secondary">ถูกระงับ</Badge>
          }
          return <Badge variant="outline">รอการอนุมัติ</Badge>
        },
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const facebookPageId = row.original.id
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
                    onClick={() =>
                      setFacebookPageStatus({ status: 'APPROVED' }, { facebookPageId })
                    }
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
                    onClick={() =>
                      setFacebookPageStatus({ status: 'REJECTED' }, { facebookPageId })
                    }
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
                  onClick={() => setFacebookPageStatus({ status: 'SUSPENDED' }, { facebookPageId })}
                >
                  <span className="sr-only">ระงับการใช้งาน</span>
                  <EyeOff className="size-4" />
                </Button>
              )}
              {status === 'SUSPENDED' && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setFacebookPageStatus({ status: 'APPROVED' }, { facebookPageId })}
                >
                  <span className="sr-only">เปิดใช้งาน</span>
                  <Eye className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <Link to="/facebook/$facebookPageId" params={{ facebookPageId }}>
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </Link>
              </Button>
            </div>
          )
        },
        size: 108,
        minSize: 108,
        maxSize: 108,
      }),
    ],
    [patchMutation.isPending, setFacebookPageStatus]
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
              { label: 'ระงับการใช้งาน', value: 'SUSPENDED' },
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

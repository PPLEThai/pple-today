'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtFilter } from 'components/datatable/DtFilter'
import { BannerCreate } from 'components/feed/BannerCreate'
import { TableCopyId } from 'components/TableCopyId'
import { ChevronDown, ChevronUp, EyeOff, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { partition } from 'remeda'

import {
  DeleteBannerParams,
  FlatBanner,
  ReorderBannerByIdByIdBody,
  ReorderBannerByIdParams,
  UpdateBannerBody,
  UpdateBannerParams,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const PUBLISHED_BANNER_LIMIT = 5

const columnHelper = createColumnHelper<FlatBanner>()

export const Data = () => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [querySearch, setQuerySearch] = useState('')
  const [queryStatus, setQueryStatus] = useState<string[]>([])

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/banners',
    {
      query: {
        search: querySearch,
        status:
          queryStatus.length > 0
            ? (queryStatus as ('DRAFT' | 'PUBLISHED' | 'ARCHIVED')[])
            : undefined,
      },
    },
    { placeholderData: keepPreviousData }
  )
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/banners/:id')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/banners/:id')
  const reorderMutation = reactQueryClient.useMutation('post', '/admin/banners/:id/reorder')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/banners', {
        query: {
          search: querySearch,
          status:
            queryStatus.length > 0
              ? (queryStatus as ('DRAFT' | 'PUBLISHED' | 'ARCHIVED')[])
              : undefined,
        },
      }),
    })
  }, [queryClient, querySearch, queryStatus])

  const setBannerStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateBannerBody['status']> },
      { id }: UpdateBannerParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { id }, body: { status } },
        { onSuccess: () => invalidateQuery() }
      )
    },
    [invalidateQuery, patchMutation]
  )
  const deleteBanner = useCallback(
    (id: DeleteBannerParams['id']) => {
      if (deleteMutation.isPending) return
      deleteMutation.mutateAsync({ pathParams: { id } }, { onSuccess: () => invalidateQuery() })
    },
    [deleteMutation, invalidateQuery]
  )
  const reorderBanner = useCallback(
    (id: ReorderBannerByIdParams['id'], data: ReorderBannerByIdByIdBody) => {
      if (reorderMutation.isPending) return
      reorderMutation.mutateAsync(
        { pathParams: { id }, body: data },
        { onSuccess: () => invalidateQuery() }
      )
    },
    [reorderMutation, invalidateQuery]
  )

  const [publishedBanners, otherBanners] = useMemo(() => {
    if (!query.data) return [[], []]
    return partition(query.data, (banner) => banner.status === 'PUBLISHED')
  }, [query.data])

  const genericColumns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => <div className="pl-2">ID</div>,
        cell: (info) => <TableCopyId id={info.getValue()} />,
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.accessor('image.url', {
        header: 'รูป',
        cell: (info) => {
          return (
            <img
              className="size-10 shrink-0 rounded-lg object-cover"
              src={info.getValue()}
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
      columnHelper.accessor('headline', {
        header: 'ข้อความพาดหัว',
        cell: (info) => (
          <NavLink className="hover:underline" to={`/feed/banner/${info.row.original.id}`}>
            {info.getValue()}
          </NavLink>
        ),
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
      columnHelper.accessor('navigation', {
        header: 'ประเภท',
        cell: (info) => {
          const navigation = info.getValue()
          if (navigation === 'IN_APP_NAVIGATION') return <Badge>In - app</Badge>
          if (navigation === 'EXTERNAL_BROWSER') return <Badge>External</Badge>
          return <Badge>Mini - app</Badge>
        },
        size: 111,
        minSize: 111,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.original.id
          const headline = row.original.headline
          const status = row.original.status

          return (
            <div className="flex gap-3">
              {status === 'PUBLISHED' ? (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setBannerStatus({ status: 'ARCHIVED' }, { id })}
                >
                  <span className="sr-only">เก็บในคลัง</span>
                  <EyeOff className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="size-8"
                  disabled={publishedBanners.length >= 5 || patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setBannerStatus({ status: 'PUBLISHED' }, { id })}
                >
                  <span className="sr-only">ประกาศ</span>
                  <Megaphone className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <NavLink to={`/feed/banner/${id}`}>
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
                    title: `ต้องการลบแบนเนอร์ "${headline}" หรือไม่?`,
                    description: 'เมื่อลบแบนเนอร์แล้วจะไม่สามารถกู้คืนได้อีก',
                    onConfirm: () => deleteBanner(id),
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
    [
      deleteBanner,
      deleteMutation.isPending,
      patchMutation.isPending,
      publishedBanners.length,
      setBannerStatus,
    ]
  )

  const orderableColumns = useMemo(() => {
    const [id, ...rest] = genericColumns
    return [
      id,
      columnHelper.accessor('order', {
        header: () => <div className="text-center">ลำดับ</div>,
        cell: (info) => {
          const id = info.row.original.id
          const index = info.row.index

          return (
            <div className="relative flex gap-3 group">
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={index === 0 || reorderMutation.isPending}
                aria-busy={reorderMutation.isPending}
                onClick={() => {
                  reorderBanner(id, { movement: 'up' })
                }}
              >
                <span className="sr-only">เลื่อนขึ้น</span>
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={index === PUBLISHED_BANNER_LIMIT - 1 || reorderMutation.isPending}
                aria-busy={reorderMutation.isPending}
                onClick={() => {
                  reorderBanner(id, { movement: 'down' })
                }}
              >
                <span className="sr-only">เลื่อนลง</span>
                <ChevronDown className="size-4" />
              </Button>
              <div className="absolute inset-0 flex items-center justify-center bg-white group-hover:opacity-0 group-hover:pointer-events-none transition-opacity">
                {index + 1}
              </div>
            </div>
          )
        },
        size: 108,
        minSize: 108,
        maxSize: 108,
      }),
      ...rest,
    ]
  }, [genericColumns, reorderBanner, reorderMutation.isPending])

  return (
    <>
      <DtFilter
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
              { label: 'ประกาศแล้ว', value: 'PUBLISHED' },
              { label: 'ร่าง', value: 'DRAFT' },
              { label: 'เก็บในคลัง', value: 'ARCHIVED' },
            ],
            state: queryStatus,
            setState: setQueryStatus,
          },
        ]}
        filterExtension={
          <BannerCreate
            trigger={
              <Button>
                <Plus />
                สร้างรูปแบนเนอร์
              </Button>
            }
            onSuccess={invalidateQuery}
          />
        }
      />
      {publishedBanners.length > 0 && (
        <DataTable
          columns={orderableColumns}
          data={publishedBanners ?? []}
          isQuerying={query.isLoading}
          headerExtension={
            <Typography className="mb-2" variant="h5">
              ประกาศแล้ว ({publishedBanners.length}/{PUBLISHED_BANNER_LIMIT})
            </Typography>
          }
        />
      )}
      {otherBanners.length > 0 && (
        <DataTable
          columns={genericColumns}
          data={otherBanners ?? []}
          isQuerying={query.isLoading}
          headerExtension={
            <Typography className="mb-2" variant="h5">
              ยังไม่ประกาศ
            </Typography>
          }
        />
      )}
      <ConfirmDialog ref={confirmDialogRef} />
    </>
  )
}

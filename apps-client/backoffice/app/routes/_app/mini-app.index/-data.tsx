'use client'

import { RefObject, useCallback, useMemo, useRef, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@pple-today/web-ui/tooltip'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtFilter } from 'components/datatable/DtFilter'
import { MiniAppCreate } from 'components/mini-app/MiniAppCreate'
import { MiniAppEdit } from 'components/mini-app/MiniAppEdit'
import { useMiniAppRoleOptions } from 'components/mini-app/useMiniAppRoleOptions'
import { ZitadelAppCreate } from 'components/mini-app/ZitadelAppCreate'
import { ZitadelAppEdit } from 'components/mini-app/ZitadelAppEdit'
import { TableCopyId } from 'components/TableCopyId'
import dayjs from 'dayjs'
import { ImageIcon, KeyRound, Lock, Pencil, Plus, Trash2 } from 'lucide-react'

import { MiniApp, ZitadelApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<MiniApp>()
const zitadelColumnHelper = createColumnHelper<ZitadelApp>()

const shortenAppTypeBadge = (appType: string) => {
  if (appType === 'OIDC_APP_TYPE_USER_AGENT') return 'USER_AGENT'
  if (appType === 'OIDC_APP_TYPE_WEB') return 'WEB'
  return appType
}

export const Data = () => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [querySearch, setQuerySearch] = useState('')

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/mini-app', {})
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/mini-app/:id')
  const roleOptions = useMiniAppRoleOptions()

  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/mini-app', {}),
    })
  }, [queryClient])

  const invalidateZitadelQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/mini-app/zitadel-app', {}),
    })
  }, [queryClient])

  const deleteMiniApp = useCallback(
    (id: string) => {
      if (deleteMutation.isPending) return
      deleteMutation.mutateAsync({ pathParams: { id } }, { onSuccess: () => invalidateQuery() })
    },
    [deleteMutation, invalidateQuery]
  )

  const filteredData = useMemo(() => {
    if (!query.data) return []
    const search = querySearch.trim().toLowerCase()
    const sorted = [...query.data].sort((a, b) => a.order - b.order)
    if (!search) return sorted
    return sorted.filter(
      (miniApp) =>
        miniApp.name.toLowerCase().includes(search) || miniApp.slug.toLowerCase().includes(search)
    )
  }, [query.data, querySearch])

  const columns = useMemo(
    () => [
      columnHelper.accessor('iconUrl', {
        header: () => <div className="text-center">ไอคอน</div>,
        cell: (info) => {
          const iconUrl = info.getValue()
          if (!iconUrl) {
            return (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-base-bg-medium text-base-text-medium">
                <ImageIcon className="size-5" />
              </div>
            )
          }
          return (
            <img
              className="size-10 shrink-0 rounded-lg object-cover"
              src={iconUrl}
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
      columnHelper.accessor('name', {
        header: 'ชื่อ',
      }),
      columnHelper.accessor('slug', {
        header: 'Slug',
      }),
      columnHelper.accessor('order', {
        header: () => <div className="text-center">ลำดับ</div>,
        cell: (info) => <div className="text-center">{info.getValue()}</div>,
        size: 80,
        minSize: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('requiresAuth', {
        header: 'การเข้าถึง',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="secondary">ต้องเข้าสู่ระบบ</Badge>
          ) : (
            <Badge variant="outline">สาธารณะ</Badge>
          ),
        size: 130,
        minSize: 130,
      }),
      columnHelper.accessor('clientId', {
        header: 'Client ID',
        cell: (info) => (
          <div className="flex items-center gap-1">
            <span className="truncate font-mono text-xs">{info.getValue()}</span>
            <TableCopyId id={info.getValue()} />
          </div>
        ),
      }),
      columnHelper.accessor('roles', {
        header: 'บทบาท',
        cell: (info) => {
          const values = info.getValue()
          if (values.length === 0) return <span className="text-base-text-medium">ทุกคน</span>
          return (
            <div className="flex flex-wrap gap-1">
              {values.map((value) => (
                <Badge key={value} variant="outline">
                  {roleOptions.getRoleLabel(value)}
                </Badge>
              ))}
            </div>
          )
        },
      }),
      columnHelper.accessor('tier', {
        header: 'สถานะ',
        cell: (info) => {
          const tier = info.getValue()
          if (tier === 'DRAFT') return <Badge variant="secondary">Draft</Badge>
          if (tier === 'BETA') return <Badge variant="default">Beta</Badge>
          return <Badge variant="outline">Live</Badge>
        },
        size: 90,
        minSize: 90,
      }),
      columnHelper.accessor('source', {
        header: 'แหล่งที่มา',
        cell: (info) =>
          info.getValue() === 'PLATFORM' ? (
            <Badge variant="secondary">จัดการโดย PPLE Platform</Badge>
          ) : (
            <Badge variant="outline">Admin</Badge>
          ),
        size: 170,
        minSize: 170,
      }),
      columnHelper.accessor('ownerSub', {
        header: 'เจ้าของ',
        cell: (info) => {
          const ownerSub = info.getValue()
          if (!ownerSub) return <span className="text-base-text-medium">-</span>
          return (
            <div className="flex items-center gap-1">
              <span className="truncate font-mono text-xs">{ownerSub}</span>
              <TableCopyId id={ownerSub} />
            </div>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'สร้างเมื่อ',
        cell: (info) => dayjs(info.getValue()).format('DD/MM/YYYY'),
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const miniApp = row.original

          if (miniApp.source === 'PLATFORM') {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-base-text-medium">
                    <Lock className="size-4" />
                    <span className="text-sm">อ่านอย่างเดียว</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>จัดการผ่าน PPLE Platform Provisioner เท่านั้น</TooltipContent>
              </Tooltip>
            )
          }

          return (
            <div className="flex gap-3">
              <MiniAppEdit
                miniApp={miniApp}
                onSuccess={invalidateQuery}
                trigger={
                  <Button variant="outline" size="icon" className="size-8">
                    <span className="sr-only">แก้ไข</span>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="outline-destructive"
                size="icon"
                className="size-8"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() => {
                  confirmDialogRef.current?.confirm({
                    title: `ต้องการลบ Mini App "${miniApp.name}" หรือไม่?`,
                    description: 'เมื่อลบ Mini App แล้วจะไม่สามารถกู้คืนได้อีก',
                    onConfirm: () => deleteMiniApp(miniApp.id),
                  })
                }}
              >
                <span className="sr-only">ลบ</span>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        },
        size: 120,
        minSize: 120,
        maxSize: 120,
      }),
    ],
    [deleteMiniApp, deleteMutation.isPending, invalidateQuery, roleOptions]
  )

  return (
    <>
      <DtFilter
        filter={[
          {
            type: 'text',
            key: 'name',
            label: 'ค้นหา Mini App',
            state: querySearch,
            setState: setQuerySearch,
          },
        ]}
        filterExtension={
          <div className="flex gap-2">
            <ZitadelAppCreate
              trigger={
                <Button variant="outline" className="gap-1">
                  <KeyRound className="size-4" />
                  สร้างแอปใน Zitadel
                </Button>
              }
              onSuccess={invalidateZitadelQuery}
            />
            <MiniAppCreate
              trigger={
                <Button className="gap-1">
                  <Plus />
                  สร้าง Mini App
                </Button>
              }
              onSuccess={invalidateQuery}
            />
          </div>
        }
      />
      {filteredData.length === 0 && !query.isLoading ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          ไม่มีข้อมูล
        </div>
      ) : (
        <DataTable columns={columns} data={filteredData} isQuerying={query.isLoading} />
      )}
      <ZitadelAppSection
        miniApps={query.data ?? []}
        confirmDialogRef={confirmDialogRef}
        invalidateZitadelQuery={invalidateZitadelQuery}
      />
      <ConfirmDialog ref={confirmDialogRef} />
    </>
  )
}

interface ZitadelAppSectionProps {
  miniApps: MiniApp[]
  confirmDialogRef: RefObject<ConfirmDialogRef | null>
  invalidateZitadelQuery: () => void
}

const ZitadelAppSection = ({
  miniApps,
  confirmDialogRef,
  invalidateZitadelQuery,
}: ZitadelAppSectionProps) => {
  const query = reactQueryClient.useQuery('/admin/mini-app/zitadel-app', {})
  const deleteMutation = reactQueryClient.useMutation(
    'delete',
    '/admin/mini-app/zitadel-app/:appId'
  )

  const notConfigured = query.error?.value.error.code === 'ZITADEL_NOT_CONFIGURED'

  const linkedClientIds = useMemo(
    () => new Set(miniApps.map((miniApp) => miniApp.clientId)),
    [miniApps]
  )

  const deleteZitadelApp = useCallback(
    (appId: string) => {
      if (deleteMutation.isPending) return
      deleteMutation.mutateAsync(
        { pathParams: { appId } },
        { onSuccess: () => invalidateZitadelQuery() }
      )
    },
    [deleteMutation, invalidateZitadelQuery]
  )

  const columns = useMemo(
    () => [
      zitadelColumnHelper.accessor('name', {
        header: 'ชื่อ',
        cell: (info) => {
          const clientId = info.row.original.clientId
          return (
            <div className="flex flex-wrap items-center gap-1">
              <span>{info.getValue()}</span>
              {linkedClientIds.has(clientId) && (
                <Badge variant="secondary">เชื่อมกับ Mini App</Badge>
              )}
            </div>
          )
        },
      }),
      zitadelColumnHelper.accessor('clientId', {
        header: 'Client ID',
        cell: (info) => (
          <div className="flex items-center gap-1">
            <span className="truncate font-mono text-xs">{info.getValue()}</span>
            <TableCopyId id={info.getValue()} />
          </div>
        ),
      }),
      zitadelColumnHelper.accessor('appType', {
        header: 'ประเภท',
        cell: (info) => <Badge variant="outline">{shortenAppTypeBadge(info.getValue())}</Badge>,
        size: 130,
        minSize: 130,
      }),
      zitadelColumnHelper.accessor('redirectUris', {
        header: 'Redirect URIs',
        cell: (info) => {
          const uris = info.getValue()
          if (uris.length === 0) return <span className="text-base-text-medium">-</span>
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <span className="truncate font-mono text-xs">{uris[0]}</span>
                  {uris.length > 1 && <Badge variant="outline">+{uris.length - 1}</Badge>}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="flex flex-col gap-0.5">
                  {uris.map((uri) => (
                    <span key={uri} className="font-mono text-xs break-all">
                      {uri}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        },
      }),
      zitadelColumnHelper.accessor('devMode', {
        header: 'Dev Mode',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="secondary">เปิด</Badge>
          ) : (
            <Badge variant="outline">ปิด</Badge>
          ),
        size: 110,
        minSize: 110,
      }),
      zitadelColumnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const zitadelApp = row.original

          return (
            <div className="flex gap-3">
              <ZitadelAppEdit
                zitadelApp={zitadelApp}
                onSuccess={invalidateZitadelQuery}
                trigger={
                  <Button variant="outline" size="icon" className="size-8">
                    <span className="sr-only">แก้ไข</span>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="outline-destructive"
                size="icon"
                className="size-8"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() => {
                  confirmDialogRef.current?.confirm({
                    title: `ต้องการลบแอป "${zitadelApp.name}" ใน Zitadel หรือไม่?`,
                    description:
                      'Mini App ที่ใช้ Client ID นี้จะไม่สามารถเข้าสู่ระบบได้อีก และไม่สามารถกู้คืนได้',
                    onConfirm: () => deleteZitadelApp(zitadelApp.appId),
                  })
                }}
              >
                <span className="sr-only">ลบ</span>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        },
        size: 120,
        minSize: 120,
        maxSize: 120,
      }),
    ],
    [
      confirmDialogRef,
      deleteMutation.isPending,
      deleteZitadelApp,
      invalidateZitadelQuery,
      linkedClientIds,
    ]
  )

  const data = query.data ?? []

  return (
    <div className="space-y-2 pt-6">
      <Typography variant="h2">Zitadel Apps</Typography>
      {notConfigured ? (
        <div className="flex flex-col items-center justify-center gap-1 p-4 border border-base-outline-default rounded-xl h-40 text-center">
          <span className="font-medium">Zitadel Management API ยังไม่ได้ตั้งค่า</span>
          <span className="text-sm text-base-text-medium">
            ตั้งค่า Zitadel Management API เพื่อจัดการแอป OIDC จากที่นี่
          </span>
        </div>
      ) : data.length === 0 && !query.isLoading ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          ไม่มีข้อมูล
        </div>
      ) : (
        <DataTable columns={columns} data={data} isQuerying={query.isLoading} />
      )}
    </div>
  )
}

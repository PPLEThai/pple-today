'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtFilter } from 'components/datatable/DtFilter'
import { MiniAppCreate } from 'components/mini-app/MiniAppCreate'
import { MiniAppEdit } from 'components/mini-app/MiniAppEdit'
import { ZitadelAppCreate } from 'components/mini-app/ZitadelAppCreate'
import { TableCopyId } from 'components/TableCopyId'
import { ImageIcon, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { getUniqueDisplayRoles } from 'utils/roles'

import { MiniApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<MiniApp>()

export const Data = () => {
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const [querySearch, setQuerySearch] = useState('')

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/mini-app', {})
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/mini-app/:id')

  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/mini-app', {}),
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
          const roles = getUniqueDisplayRoles(info.getValue())
          if (roles.length === 0) return <span className="text-base-text-medium">ทุกคน</span>
          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const miniApp = row.original

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
    [deleteMiniApp, deleteMutation.isPending, invalidateQuery]
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
      <ConfirmDialog ref={confirmDialogRef} />
    </>
  )
}

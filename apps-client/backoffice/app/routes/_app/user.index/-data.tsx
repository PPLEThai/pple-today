'use client'

import React, { useCallback, useMemo, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { DtFilter } from 'components/datatable/DtFilter'
import { DtMovement } from 'components/datatable/DtMovement'
import { TableCopyId } from 'components/TableCopyId'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { getRoleName, getUniqueDisplayRoles, ROLES } from 'utils/roles'
import { telFormatter } from 'utils/tel'

import { GetUsersResponse, UpdateUserBody, UpdateUserParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<GetUsersResponse['users'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const [querySearch, setQuerySearch] = useState('')
  const [queryRoles, setQueryRoles] = useState<string[]>([])

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/users',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch.length ? querySearch : undefined,
        roles: queryRoles.length > 0 ? queryRoles : undefined,
      },
    },
    { placeholderData: keepPreviousData }
  )
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/users/:userId')

  const setUserStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateUserBody['status']> },
      { userId }: UpdateUserParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { userId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/users', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch.length ? querySearch : undefined,
                  roles: queryRoles.length > 0 ? queryRoles : undefined,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.users.findIndex((u) => u.id === userId)
                if (idx === -1) return
                data.users[idx].status = status
                return data
              }
            )
          },
        }
      )
    },
    [patchMutation, queryClient, queryLimit, queryPage, queryRoles, querySearch]
  )

  const genericColumns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => <div className="pl-2">ID</div>,
        cell: (info) => <TableCopyId id={info.getValue()} />,
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.accessor('name', {
        header: 'ชื่อผู้ใช้งาน',
        cell: (info) => (
          <Link
            className="hover:underline"
            to="/user/$userId"
            params={{ userId: info.row.original.id }}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('phoneNumber', {
        header: 'เบอร์โทร',
        cell: (info) => telFormatter(info.getValue()),
        size: 127,
        minSize: 127,
      }),
      columnHelper.accessor('roles', {
        header: 'หน้าที่',
        cell: (info) => (
          <div className="flex items-center gap-2">
            {getUniqueDisplayRoles(info.getValue()).map((displayRole) => (
              <Badge key={displayRole}>{displayRole}</Badge>
            ))}
          </div>
        ),
        size: 97,
        minSize: 97,
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'ACTIVE') return <Badge variant="success">เปิดใช้งาน</Badge>
          return <Badge variant="destructive">ระงับ</Badge>
        },
        size: 101,
        minSize: 101,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.original.id
          const status = row.original.status

          return (
            <div className="flex gap-3">
              {status === 'ACTIVE' ? (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setUserStatus({ status: 'SUSPENDED' }, { userId: id })}
                >
                  <span className="sr-only">ระงับการใช้งาน</span>
                  <EyeOff className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setUserStatus({ status: 'ACTIVE' }, { userId: id })}
                >
                  <span className="sr-only">เปิดใช้งาน</span>
                  <Eye className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <Link to="/user/$userId" params={{ userId: id }}>
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
    [patchMutation.isPending, setUserStatus]
  )

  return (
    <>
      <DtFilter
        filter={[
          {
            type: 'text',
            key: 'name',
            label: 'ค้นหาชื่อ',
            state: querySearch,
            setState: setQuerySearch,
          },
          {
            type: 'enum',
            key: 'status',
            label: 'หน้าที่',
            options: [
              ...ROLES.map((r) => ({ label: getRoleName(r), value: r })),
              { label: 'ประชาชน', value: 'citizen' },
            ],
            state: queryRoles,
            setState: setQueryRoles,
          },
        ]}
      />
      <DataTable
        columns={genericColumns}
        data={query.data?.users ?? []}
        isQuerying={query.isLoading}
        footerExtension={
          <DtMovement
            length={query.data?.users?.length ?? 0}
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
    </>
  )
}

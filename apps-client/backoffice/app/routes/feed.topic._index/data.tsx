'use client'

import { useCallback, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Switch } from '@pple-today/web-ui/switch'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'
import { Pencil, Plus } from 'lucide-react'

import { GetTopicsResponse, UpdateTopicBody, UpdateTopicParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<GetTopicsResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)
  const [querySearch, setQuerySearch] = useState('')

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/topics',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )
  const mutation = reactQueryClient.useMutation('patch', '/admin/topics/:topicId')

  const setTopicStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateTopicBody['status']> },
      { topicId }: UpdateTopicParams
    ) => {
      if (mutation.isPending) return

      mutation.mutateAsync(
        {
          pathParams: {
            topicId,
          },
          body: {
            status,
          },
        },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/topics', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === topicId)
                if (idx === -1) return
                data.data[idx].status = status
                return data
              }
            )
          },
        }
      )
    },
    [mutation, queryClient, queryLimit, queryPage, querySearch]
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
        header: 'ชื่อหัวข้อ',
      }),
      // TODO - Follower
      columnHelper.display({
        header: 'ยอดผู้ติดตาม',
        cell: () => {
          const VALUE = 2400
          return `${VALUE.toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })} คน`
        },
        size: 54,
        minSize: 54,
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'PUBLISH') return <Badge variant="success">เปิดใช้งาน</Badge>
          return <Badge variant="outline">ร่าง</Badge>
        },
        size: 101,
        minSize: 101,
        maxSize: 101,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.getValue<GetTopicsResponse['data'][number]['id']>('id')
          return (
            <Button variant="outline" size="icon" className="size-8" asChild>
              <NavLink to={`/feed/topic/${id}`}>
                <span className="sr-only">จัดการ</span>
                <Pencil className="size-4" />
              </NavLink>
            </Button>
          )
        },
        size: 72,
        minSize: 72,
        maxSize: 72,
      }),
      columnHelper.display({
        id: 'enabled',
        header: 'เปิดใช้งาน',
        cell: ({ row }) => {
          const id = row.getValue<GetTopicsResponse['data'][number]['id']>('id')
          const status = row.getValue<GetTopicsResponse['data'][number]['status']>('status')
          return (
            <Switch
              isPending={mutation.isPending && mutation.variables?.pathParams.topicId === id}
              checked={status === 'PUBLISH'}
              onCheckedChange={(checked: boolean) => {
                setTopicStatus({ status: checked ? 'PUBLISH' : 'DRAFT' }, { topicId: id })
              }}
            />
          )
        },
        size: 115,
        minSize: 115,
        maxSize: 115,
      }),
    ],
    [mutation.isPending, mutation.variables?.pathParams.topicId, setTopicStatus]
  )

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      count={query.data?.count ?? 0}
      isQuerying={query.isLoading}
      isMutating={mutation.isPending}
      queryLimit={queryLimit}
      setQueryLimit={setQueryLimit}
      queryPage={queryPage}
      setQueryPage={setQueryPage}
      filter={[
        {
          type: 'text',
          key: 'name',
          label: 'ค้นหาหัวข้อ',
          state: querySearch,
          setState: setQuerySearch,
        },
      ]}
      filterExtension={
        <Button asChild>
          <NavLink to="/feed/topic/create">
            <Plus />
            สร้างหัวข้อ
          </NavLink>
        </Button>
      }
    />
  )
}

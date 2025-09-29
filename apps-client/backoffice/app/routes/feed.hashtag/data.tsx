'use client'

import { useCallback, useMemo, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Switch } from '@pple-today/web-ui/switch'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'

import { GetHashtagsResponse, UpdateHashtagBody, UpdateHashtagParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<GetHashtagsResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)
  const [querySearch, setQuerySearch] = useState('')

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/hashtags',
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
  const mutation = reactQueryClient.useMutation('put', '/admin/hashtags/:hashtagId')

  const setHashtagStatus = useCallback(
    ({ name, status }: UpdateHashtagBody, { hashtagId }: UpdateHashtagParams) => {
      if (mutation.isPending) return

      mutation.mutateAsync(
        {
          pathParams: {
            hashtagId,
          },
          body: {
            name,
            status,
          },
        },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/hashtags', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  search: querySearch,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === hashtagId)
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
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'PUBLISH') return <Badge variant="success">เปิดใช้งาน</Badge>
          return <Badge variant="destructive">ระงับการใช้งาน</Badge>
        },
      }),
      columnHelper.accessor('name', {
        header: 'ชื่อ Hashtag',
      }),
      columnHelper.display({
        id: 'enabled',
        header: 'เปิดใช้งาน',
        cell: ({ row }) => {
          const id = row.getValue<GetHashtagsResponse['data'][number]['id']>('id')
          const name = row.getValue<GetHashtagsResponse['data'][number]['name']>('name')
          const status = row.getValue<GetHashtagsResponse['data'][number]['status']>('status')
          return (
            <Switch
              isPending={mutation.isPending && mutation.variables?.pathParams.hashtagId === id}
              checked={status === 'PUBLISH'}
              onCheckedChange={(checked: boolean) => {
                setHashtagStatus(
                  { name, status: checked ? 'PUBLISH' : 'SUSPEND' },
                  { hashtagId: id }
                )
              }}
            />
          )
        },
      }),
    ],
    [mutation.isPending, mutation.variables?.pathParams.hashtagId, setHashtagStatus]
  )

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      count={query.data?.count ?? 0}
      isLoading={query.isLoading}
      queryLimit={queryLimit}
      setQueryLimit={setQueryLimit}
      queryPage={queryPage}
      setQueryPage={setQueryPage}
      filter={[
        {
          type: 'text',
          key: 'name',
          label: 'ค้นหาแฮชแท็ก',
          state: querySearch,
          setState: setQuerySearch,
        },
      ]}
    />
  )
}

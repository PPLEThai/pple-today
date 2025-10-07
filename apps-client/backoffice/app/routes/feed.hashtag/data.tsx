'use client'

import { useCallback, useMemo, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'
import { EyeOff, Megaphone } from 'lucide-react'

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
  const mutation = reactQueryClient.useMutation('patch', '/admin/hashtags/:hashtagId')

  const setHashtagStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateHashtagBody['status']> },
      { hashtagId }: UpdateHashtagParams
    ) => {
      if (mutation.isPending) return

      mutation.mutateAsync(
        {
          pathParams: {
            hashtagId,
          },
          body: {
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
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.accessor('name', {
        header: 'ชื่อ Hashtag',
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => {
          const status = info.getValue()
          if (status === 'PUBLISHED') return <Badge variant="success">เปิดใช้งาน</Badge>
          return <Badge variant="destructive">ระงับการใช้งาน</Badge>
        },
        size: 101,
        minSize: 101,
        maxSize: 126,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.getValue<GetHashtagsResponse['data'][number]['id']>('id')
          const status = row.getValue<GetHashtagsResponse['data'][number]['status']>('status')

          return status === 'PUBLISHED' ? (
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              onClick={() => setHashtagStatus({ status: 'SUSPENDED' }, { hashtagId: id })}
            >
              <span className="sr-only">ระงับการใช้งาน</span>
              <EyeOff className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="size-8"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              onClick={() => setHashtagStatus({ status: 'PUBLISHED' }, { hashtagId: id })}
            >
              <span className="sr-only">เปิดใช้งาน</span>
              <Megaphone className="size-4" />
            </Button>
          )
        },
        size: 72,
        minSize: 72,
        maxSize: 72,
      }),
    ],
    [mutation.isPending, mutation.variables?.pathParams.hashtagId, setHashtagStatus]
  )

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      count={query.data?.meta.count ?? 0}
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
          label: 'ค้นหาแฮชแท็ก',
          state: querySearch,
          setState: setQuerySearch,
        },
      ]}
    />
  )
}

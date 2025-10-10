'use client'

import { useCallback, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { TopicCreate } from 'components/feed/TopicCreate'
import { TableCopyId } from 'components/TableCopyId'
import { EyeOff, Megaphone, Pencil, Plus } from 'lucide-react'

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
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/topics', {
        query: {
          limit: queryLimit,
          page: queryPage,
          search: querySearch,
        },
      }),
    })
  }, [queryClient, queryLimit, queryPage, querySearch])

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
        cell: (info) => (
          <NavLink className="hover:underline" to={`/feed/topic/${info.row.getValue('id')}`}>
            {info.getValue()}
          </NavLink>
        ),
      }),
      columnHelper.accessor('followersCount', {
        header: 'ยอดผู้ติดตาม',
        cell: (info) =>
          `${info.getValue().toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })} คน`,
        size: 110,
        minSize: 110,
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
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: ({ row }) => {
          const id = row.getValue<GetTopicsResponse['data'][number]['id']>('id')
          const status = row.getValue<GetTopicsResponse['data'][number]['status']>('status')

          return (
            <div className="flex gap-3">
              {status === 'PUBLISHED' ? (
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={mutation.isPending}
                  aria-busy={mutation.isPending}
                  onClick={() => setTopicStatus({ status: 'SUSPENDED' }, { topicId: id })}
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
                  onClick={() => setTopicStatus({ status: 'PUBLISHED' }, { topicId: id })}
                >
                  <span className="sr-only">เปิดใช้งาน</span>
                  <Megaphone className="size-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="size-8" asChild>
                <NavLink to={`/feed/topic/${id}`}>
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
    [mutation.isPending, setTopicStatus]
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
          label: 'ค้นหาหัวข้อ',
          state: querySearch,
          setState: setQuerySearch,
        },
      ]}
      filterExtension={
        <TopicCreate
          trigger={
            <Button>
              <Plus />
              สร้างหัวข้อ
            </Button>
          }
          onSuccess={invalidateQuery}
        />
      }
    />
  )
}

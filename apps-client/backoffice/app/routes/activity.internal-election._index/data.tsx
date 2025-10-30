'use client'

import { useCallback, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { TableCopyId } from 'components/TableCopyId'
import { CalendarX2, Pencil, Trash2, Users } from 'lucide-react'
import { AdminListElectionResponse } from 'node_modules/@api/backoffice/src/modules/admin/election/models'

import { ElectionInfo, ElectionStatus } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { exhaustiveGuard } from '../../../../../packages/api-common/src/utils/common'
import { Button } from '@pple-today/web-ui/button'

const columnHelper = createColumnHelper<AdminListElectionResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)
  const [queryName, setQueryName] = useState('')
  const [queryStatus, setQueryStatus] = useState<ElectionStatus[]>()

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/elections',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        name: queryName,
        status: queryStatus?.length === 0 ? undefined : queryStatus,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const cancelMutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/cancel')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/elections/:electionId')

  const cancelElection = useCallback(
    (electionId: string) => {
      if (cancelMutation.isPending) return

      cancelMutation.mutateAsync(
        { pathParams: { electionId } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/elections', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  name: queryName,
                  status: queryStatus,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === electionId)
                if (!idx) return
                data.data[idx].isCancelled = true
                return data
              }
            )
          },
        }
      )
    },
    [cancelMutation, queryClient, queryLimit, queryPage, queryName, queryStatus]
  )

  const deleteElection = useCallback(
    (electionId: string) => {
      if (deleteMutation.isPending) return

      deleteMutation.mutateAsync(
        { pathParams: { electionId } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/elections', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  name: queryName,
                  status: queryStatus,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                data.data = data.data.filter((d) => d.id !== electionId)
                return data
              }
            )
          },
        }
      )
    },
    [deleteMutation, queryClient, queryLimit, queryPage, queryName, queryStatus]
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
        header: 'ชื่อการเลือกตั้ง',
        cell: (info) => (
          <NavLink
            className="hover:underline"
            to={`/activity/internal-election/${info.row.original.id}`}
          >
            {info.getValue()}
          </NavLink>
        ),
      }),
      columnHelper.accessor('district', {
        header: 'อำเภอ/เขต',
        cell: (info) => info.getValue() ?? '-',
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('province', {
        header: 'จังหวัด',
        cell: (info) => info.getValue() ?? '-',
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => <ElectionStatusBadge status={info.getValue()} />,
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'votingTimeline',
        header: 'ช่วงเวาลงคะเเนน',
        cell: (info) => {
          const openVote = new Date(info.row.original.openVoting).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })

          const closeVote = new Date(info.row.original.closeVoting).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })

          return (
            <Typography
              variant="small"
              className="font-extralight"
            >{`${openVote} - ${closeVote}`}</Typography>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'ประเภท',
        cell: (info) => <ElectionTypeBadge type={info.getValue()} />,
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('totalVoters', {
        header: 'จำนวนลงคะเเนน',
        cell: (info) => (
          <span className="flex gap-2 items-center">
            <Users strokeWidth={1.5} />
            <Typography variant="small" className="font-extralight">
              {info.getValue()}
            </Typography>
          </span>
        ),
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: (info) => {
          const { status, isCancelled, id } = info.row.original

          return (
            <span className="flex items-center gap-2">
              <Button size="icon" variant="outline" disabled={status !== 'DRAFT'}>
                <Pencil strokeWidth={1} size={20} />
              </Button>
              {status === 'DRAFT' ? (
                <Button size="icon" variant="outline" onClick={() => deleteElection(id)}>
                  <Trash2 className="text-system-danger-default" strokeWidth={1} size={20} />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="outline"
                  disabled={isCancelled}
                  onClick={() => cancelElection(id)}
                >
                  <CalendarX2 className="text-system-danger-default" strokeWidth={1} size={20} />
                </Button>
              )}
            </span>
          )
        },
      }),
    ],
    [cancelElection, deleteElection]
  )

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      count={query.data?.meta.count ?? 0}
      isQuerying={query.isLoading}
      isMutating={cancelMutation.isPending || deleteMutation.isPending}
      queryLimit={queryLimit}
      setQueryLimit={setQueryLimit}
      queryPage={queryPage}
      setQueryPage={setQueryPage}
      filter={[
        {
          type: 'text',
          key: 'name',
          label: 'ค้นหาการเลือกตั้ง',
          state: queryName,
          setState: setQueryName,
        },
        {
          type: 'enum',
          key: 'status',
          label: 'สถานะ',
          options: [
            { value: 'DRAFT', label: 'ร่าง' },
            { value: 'NOT_OPENED_VOTE', label: 'ยังไม่เปิดหีบ' },
            { value: 'OPEN_VOTE', label: 'เปิดหีบ' },
            { value: 'CLOSED_VOTE', label: 'ปิดหีบ' },
            { value: 'RESULT_ANNOUNCE', label: 'ประกาศผล' },
          ],
          state: queryStatus || [],
          setState: setQueryStatus as any,
        },
      ]}
    />
  )
}

const ElectionStatusBadge = ({ status }: { status: ElectionStatus }) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="outline">ร่าง</Badge>
    case 'NOT_OPENED_VOTE':
      return <Badge variant="secondary">ยังไม่เปิดหีบ</Badge>
    case 'OPEN_VOTE':
      return <Badge variant="success">เปิดหีบ</Badge>
    case 'CLOSED_VOTE':
      return <Badge variant="destructive">ปิดหีบ</Badge>
    case 'RESULT_ANNOUNCE':
      return <Badge variant="default">ประกาศผล</Badge>
    default:
      exhaustiveGuard(status)
  }
}

const ElectionTypeBadge = ({ type }: { type: ElectionInfo['type'] }) => {
  switch (type) {
    case 'ONSITE':
      return <Badge variant="default">ในสถานที่</Badge>
    case 'ONLINE':
      return <Badge variant="default">ออนไลน์</Badge>
    case 'HYBRID':
      return <Badge variant="default">ผสม</Badge>
    default:
      exhaustiveGuard(type)
  }
}

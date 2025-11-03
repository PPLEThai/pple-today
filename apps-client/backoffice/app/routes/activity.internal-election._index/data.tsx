import { useCallback, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import ElectionStatusBadge from 'components/election/ElectionStatusBadge'
import ElectionTypeBadge from 'components/election/ElectionTypeBadge'
import { TableCopyId } from 'components/TableCopyId'
import { CalendarX2, Pencil, Trash2, Users } from 'lucide-react'
import { getTimelineString } from 'utils/date'

import { AdminListElectionResponse, ElectionStatus } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

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
                  status: queryStatus?.length === 0 ? undefined : queryStatus,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === electionId)
                if (idx === -1) return
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
        header: 'ช่วงเวลาลงคะแนน',
        cell: (info) => {
          const { openVoting, closeVoting } = info.row.original

          return (
            <Typography variant="small" className="font-extralight">
              {getTimelineString(new Date(openVoting), new Date(closeVoting))}
            </Typography>
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
        header: 'จำนวนลงคะแนน',
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
          setState: setQueryStatus as React.Dispatch<React.SetStateAction<string[]>>,
        },
      ]}
    />
  )
}

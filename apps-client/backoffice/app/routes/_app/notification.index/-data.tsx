import { useMemo, useState } from 'react'

import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { DtMovement } from 'components/datatable/DtMovement'
import { formatAudience, InteractionStateBadge } from 'components/notification/NotificationDisplay'
import { TableCopyId } from 'components/TableCopyId'
import { formatDisplayDateTime } from 'utils/date'

import type { AdminListSentNotificationsResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<AdminListSentNotificationsResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)

  const query = reactQueryClient.useQuery(
    '/admin/notifications/sent',
    { query: { limit: queryLimit, page: queryPage } },
    { placeholderData: keepPreviousData }
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
      columnHelper.accessor('title', {
        header: 'หัวข้อ',
        cell: (info) => (
          <Link
            className="hover:underline"
            to="/notification/$notificationId"
            params={{ notificationId: info.row.original.id }}
          >
            <div className="font-medium">{info.getValue()}</div>
            <div className="text-xs text-base-text-medium line-clamp-1">
              {info.row.original.message}
            </div>
          </Link>
        ),
        minSize: 240,
      }),
      columnHelper.accessor('audience', {
        header: 'ผู้รับ',
        cell: (info) => <span className="line-clamp-2">{formatAudience(info.getValue())}</span>,
        size: 220,
      }),
      columnHelper.accessor('recipientCount', {
        header: 'จำนวนผู้รับ',
        cell: (info) => info.getValue().toLocaleString(),
        size: 100,
      }),
      columnHelper.accessor('interactionState', {
        header: 'แบบฟอร์ม',
        cell: (info) =>
          info.row.original.hasInteraction ? (
            <div className="flex flex-col gap-1 items-start">
              <InteractionStateBadge state={info.getValue()} />
              <span className="text-xs text-base-text-medium">
                ตอบแล้ว {info.row.original.responseCount.toLocaleString()} คน
              </span>
            </div>
          ) : (
            <span className="text-base-text-medium">-</span>
          ),
        size: 140,
      }),
      columnHelper.accessor('sentBy', {
        header: 'ส่งโดย',
        cell: (info) => info.getValue()?.name ?? '-',
        size: 140,
      }),
      columnHelper.accessor('createdAt', {
        header: 'ส่งเมื่อ',
        cell: (info) => formatDisplayDateTime(info.getValue()),
        size: 140,
      }),
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      isQuerying={query.isLoading}
      footerExtension={
        <DtMovement
          length={query.data?.data.length ?? 0}
          count={query.data?.meta.count ?? 0}
          isQuerying={query.isLoading}
          queryLimit={queryLimit}
          setQueryLimit={setQueryLimit}
          queryPage={queryPage}
          setQueryPage={setQueryPage}
        />
      }
    />
  )
}

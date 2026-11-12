'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { DataTable } from '@pple-today/web-ui/data-table'
import { keepPreviousData } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { DtFilter } from 'components/datatable/DtFilter'
import { DtMovement } from 'components/datatable/DtMovement'
import dayjs from 'utils/date'
import { telFormatter } from 'utils/tel'

import { GetFacebookConnectAttemptsResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

/**
 * Diagnostics of "connect a Facebook page" attempts from the mobile app. See
 * docs/facebook-connect-diagnostics.md for what each step and field means.
 */

export type FacebookConnectAttemptOutcome =
  GetFacebookConnectAttemptsResponse['items'][number]['outcome']

export const OUTCOME_LABELS: Record<FacebookConnectAttemptOutcome, string> = {
  SUCCESS: 'สำเร็จ',
  FAILED: 'ล้มเหลว',
  CANCELLED: 'ผู้ใช้ยกเลิก',
  ABANDONED: 'ออกก่อนเสร็จ',
}

export const FAILED_STEP_LABELS: Record<string, string> = {
  tracking_permission: 'ไม่อนุญาตการติดตาม (iOS)',
  tracking_prompt: 'หน้าขออนุญาตการติดตาม',
  opened_settings: 'ไปที่การตั้งค่า',
  login: 'เข้าสู่ระบบ Facebook',
  graph_accounts: 'ดึงรายชื่อเพจ',
  no_pages: 'ไม่พบเพจ',
  link_page: 'เชื่อมต่อเพจ',
  page_picker: 'หน้าเลือกเพจ',
  superseded: 'เริ่มใหม่ก่อนเสร็จ',
}

export const failedStepLabel = (step: string | null) =>
  step ? (FAILED_STEP_LABELS[step] ?? step) : '-'

export const formatDateTime = (date: Date | string) =>
  dayjs(date).locale('th').format('DD/MM/BBBB HH:mm:ss')

export function OutcomeBadge({ outcome }: { outcome: FacebookConnectAttemptOutcome }) {
  switch (outcome) {
    case 'SUCCESS':
      return <Badge variant="success">{OUTCOME_LABELS.SUCCESS}</Badge>
    case 'FAILED':
      return <Badge variant="destructive">{OUTCOME_LABELS.FAILED}</Badge>
    case 'CANCELLED':
      return <Badge variant="secondary">{OUTCOME_LABELS.CANCELLED}</Badge>
    default:
      return <Badge variant="outline">{OUTCOME_LABELS.ABANDONED}</Badge>
  }
}

export function errorSummary(attempt: {
  errorDomain: string | null
  errorCode: string | null
  errorMessage: string | null
}) {
  const head = [attempt.errorDomain, attempt.errorCode].filter(Boolean).join(' ')
  return [head, attempt.errorMessage].filter(Boolean).join(' · ') || '-'
}

type Attempt = GetFacebookConnectAttemptsResponse['items'][number]
const columnHelper = createColumnHelper<Attempt>()

/**
 * Connect attempts, newest first, filterable by reference code / name / phone
 * and outcome. Pass `userId` to show one user's attempts (the user column is
 * then hidden).
 */
export function FacebookConnectAttemptTable({ userId }: { userId?: string }) {
  const [queryLimit, setQueryLimit] = useState(userId ? 10 : 20)
  const [queryPage, setQueryPage] = useState(1)
  const [querySearch, setQuerySearch] = useState('')
  const [queryOutcome, setQueryOutcome] = useState<string[]>([])

  const query = reactQueryClient.useQuery(
    '/admin/facebook/connect-attempts',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        search: querySearch || undefined,
        userId,
        outcome:
          queryOutcome.length > 0 ? (queryOutcome as FacebookConnectAttemptOutcome[]) : undefined,
      },
    },
    { placeholderData: keepPreviousData }
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: () => <div className="pl-2">เวลา</div>,
        cell: (info) => (
          <div className="pl-2 whitespace-nowrap">{formatDateTime(info.getValue())}</div>
        ),
        size: 170,
        minSize: 170,
      }),
      columnHelper.accessor('referenceCode', {
        header: 'รหัสอ้างอิง',
        cell: (info) => (
          <Link
            className="font-mono hover:underline"
            to="/facebook/connect-attempts/$attemptId"
            params={{ attemptId: info.row.original.id }}
          >
            {info.getValue()}
          </Link>
        ),
        size: 100,
        minSize: 100,
      }),
      ...(userId
        ? []
        : [
            columnHelper.accessor('user', {
              header: 'ผู้ใช้งาน',
              cell: (info) => (
                <Link
                  className="hover:underline"
                  to="/user/$userId"
                  params={{ userId: info.getValue().id }}
                >
                  <div>{info.getValue().name}</div>
                  <div className="text-xs text-base-text-medium">
                    {telFormatter(info.getValue().phoneNumber)}
                  </div>
                </Link>
              ),
            }),
          ]),
      columnHelper.accessor('outcome', {
        header: 'ผลลัพธ์',
        cell: (info) => <OutcomeBadge outcome={info.getValue()} />,
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('failedStep', {
        header: 'ขั้นตอน',
        cell: (info) => failedStepLabel(info.getValue()),
      }),
      columnHelper.display({
        id: 'error',
        header: 'ข้อผิดพลาด',
        cell: ({ row }) => (
          <div className="max-w-80 truncate" title={errorSummary(row.original)}>
            {errorSummary(row.original)}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'device',
        header: 'อุปกรณ์',
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            {row.original.platform} {row.original.osVersion ?? ''}
            <div className="text-xs text-base-text-medium">
              แอป {row.original.appVersion ?? '-'}
            </div>
          </div>
        ),
      }),
    ],
    [userId]
  )

  return (
    <div className="space-y-2">
      <DtFilter
        filter={[
          {
            type: 'text',
            key: 'search',
            label: userId ? 'ค้นหารหัสอ้างอิง' : 'รหัสอ้างอิง ชื่อ หรือเบอร์โทร',
            state: querySearch,
            setState: setQuerySearch,
          },
          {
            type: 'enum',
            key: 'outcome',
            label: 'ผลลัพธ์',
            options: (Object.keys(OUTCOME_LABELS) as FacebookConnectAttemptOutcome[]).map(
              (value) => ({ value, label: OUTCOME_LABELS[value] })
            ),
            state: queryOutcome,
            setState: setQueryOutcome,
          },
        ]}
        onChange={() => setQueryPage(1)}
      />
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        isQuerying={query.isLoading}
        footerExtension={
          <DtMovement
            length={query.data?.items?.length ?? 0}
            count={query.data?.meta.count ?? 0}
            isQuerying={query.isLoading}
            queryLimit={queryLimit}
            setQueryLimit={setQueryLimit}
            queryPage={queryPage}
            setQueryPage={setQueryPage}
          />
        }
      />
    </div>
  )
}

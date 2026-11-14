'use client'

import { useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pple-today/web-ui/table'
import { Typography } from '@pple-today/web-ui/typography'
import { failedStepLabel, formatDateTime } from 'components/facebook/FacebookConnectAttempts'

import { reactQueryClient } from '~/libs/api-client'

const PERIODS = [1, 7, 30, 90]

/** Outcome totals and the most common failure causes over a period. */
export function FailureSummary() {
  const [days, setDays] = useState(7)
  const query = reactQueryClient.useQuery('/admin/facebook/connect-attempts/summary', {
    query: { days },
  })
  const totals = query.data?.totals

  return (
    <div className="flex flex-col gap-4 p-4 border border-base-outline-default rounded-xl">
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="h3">สรุปย้อนหลัง {days} วัน</Typography>
        <div className="ml-auto flex gap-1">
          {PERIODS.map((period) => (
            <Button
              key={period}
              size="sm"
              variant={period === days ? 'default' : 'outline'}
              onClick={() => setDays(period)}
            >
              {period} วัน
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="ทั้งหมด" value={totals?.attempts} />
        <Stat label="สำเร็จ" value={totals?.succeeded} />
        <Stat label="ล้มเหลว" value={totals?.failed} />
        <Stat label="ผู้ใช้ยกเลิก" value={totals?.cancelled} />
        <Stat label="ออกก่อนเสร็จ" value={totals?.abandoned} />
      </div>
      <div>
        <div className="text-sm font-medium pb-2">สาเหตุที่ล้มเหลวบ่อย</div>
        {query.isLoading ? (
          <div className="text-sm text-base-text-medium">Loading...</div>
        ) : !query.data || query.data.failures.length === 0 ? (
          <div className="text-sm text-base-text-medium">ไม่มีการเชื่อมต่อที่ล้มเหลว</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ขั้นตอน</TableHead>
                <TableHead>แพลตฟอร์ม</TableHead>
                <TableHead>ข้อผิดพลาด</TableHead>
                <TableHead className="text-right">ครั้ง</TableHead>
                <TableHead className="text-right">ผู้ใช้</TableHead>
                <TableHead>ล่าสุด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.failures.map((failure) => (
                <TableRow
                  key={[
                    failure.failedStep,
                    failure.platform,
                    failure.errorDomain,
                    failure.errorCode,
                  ].join('|')}
                >
                  <TableCell>{failedStepLabel(failure.failedStep)}</TableCell>
                  <TableCell>{failure.platform}</TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">
                      {[failure.errorDomain, failure.errorCode].filter(Boolean).join(' ') || '-'}
                    </div>
                    {failure.exampleMessage && (
                      <div
                        className="max-w-96 truncate text-xs text-base-text-medium"
                        title={failure.exampleMessage}
                      >
                        {failure.exampleMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{failure.attempts}</TableCell>
                  <TableCell className="text-right">{failure.users}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(failure.lastSeenAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-base-bg-default">
      <span className="text-xs text-base-text-medium">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value ?? '-'}</span>
    </div>
  )
}

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Typography } from '@pple-today/web-ui/typography'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  errorSummary,
  failedStepLabel,
  formatDateTime,
  OutcomeBadge,
} from 'components/facebook/FacebookConnectAttempts'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { Facebook } from 'lucide-react'
import { telFormatter } from 'utils/tel'

import { reactQueryClient } from '~/libs/api-client'

export const Route = createFileRoute('/_app/facebook/connect-attempts/$attemptId')({
  component: FacebookConnectAttemptPage,
  head: () => ({ meta: [{ title: 'รายละเอียดการเชื่อมต่อเพจ Facebook' }] }),
})

const CONTEXT_LABELS: Record<string, string> = {
  deviceModel: 'รุ่นอุปกรณ์',
  facebookAppInstalled: 'ติดตั้งแอป Facebook',
  trackingPermission: 'สิทธิ์การติดตาม (iOS)',
}

function FacebookConnectAttemptPage() {
  const { attemptId } = Route.useParams()
  const query = reactQueryClient.useQuery('/admin/facebook/connect-attempts/:attemptId', {
    pathParams: { attemptId },
  })
  const attempt = query.data

  return (
    <div className="px-6 pb-6">
      <Breadcrumb className="py-4">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/facebook">Facebook</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/facebook/connect-attempts">ประวัติการเชื่อมต่อ</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{attempt?.referenceCode ?? 'รายละเอียด'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <Facebook className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">การเชื่อมต่อเพจ {attempt?.referenceCode}</Typography>
        {attempt && (
          <div className="ml-auto">
            <OutcomeBadge outcome={attempt.outcome} />
          </div>
        )}
      </div>
      {query.isLoading ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          Loading...
        </div>
      ) : !attempt ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          ไม่มีข้อมูล
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          <div className="grid gap-x-8 gap-y-3 p-4 border border-base-outline-default rounded-xl md:grid-cols-2 text-sm">
            <Field label="ผู้ใช้งาน">
              <Link
                className="hover:underline"
                to="/user/$userId"
                params={{ userId: attempt.user.id }}
              >
                {attempt.user.name} ({telFormatter(attempt.user.phoneNumber)})
              </Link>
            </Field>
            <Field label="ID">
              <FeedDetailCopyId id={attempt.id} />
            </Field>
            <Field label="เริ่ม">{formatDateTime(attempt.startedAt)}</Field>
            <Field label="บันทึกเมื่อ">{formatDateTime(attempt.createdAt)}</Field>
            <Field label="ขั้นตอนที่จบ">{failedStepLabel(attempt.failedStep)}</Field>
            <Field label="ข้อผิดพลาด">
              <span className="break-all">{errorSummary(attempt)}</span>
            </Field>
            <Field label="อุปกรณ์">
              {attempt.platform} {attempt.osVersion ?? ''}
            </Field>
            <Field label="เวอร์ชันแอป">
              {attempt.appVersion ?? '-'}
              {attempt.buildNumber ? ` (${attempt.buildNumber})` : ''}
            </Field>
            {Object.entries(attempt.context).map(([key, value]) => (
              <Field key={key} label={CONTEXT_LABELS[key] ?? key}>
                {formatValue(value)}
              </Field>
            ))}
          </div>
          <div className="flex flex-col gap-3 p-4 border border-base-outline-default rounded-xl">
            <Typography variant="h3">ลำดับเหตุการณ์</Typography>
            <ol className="flex flex-col">
              {attempt.steps.map((step, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[72px_1fr] gap-3 py-2 border-b border-base-outline-default last:border-0"
                >
                  <span className="text-xs text-base-text-medium tabular-nums pt-0.5">
                    +{(step.at / 1000).toFixed(1)}s
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium">{step.name}</div>
                    {step.data && Object.keys(step.data).length > 0 && (
                      <pre className="mt-1 text-xs whitespace-pre-wrap break-all bg-base-bg-default rounded-md p-2">
                        {JSON.stringify(step.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="shrink-0 w-36 text-base-text-medium">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function formatValue(value: unknown) {
  if (value === true) return 'ใช่'
  if (value === false) return 'ไม่'
  if (value === null || value === undefined || value === '') return '-'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

import { useMemo, useRef, useState } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Button } from '@pple-today/web-ui/button'
import { Card } from '@pple-today/web-ui/card'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { ConfirmDialog, type ConfirmDialogRef } from 'components/ConfirmDialog'
import { DtMovement } from 'components/datatable/DtMovement'
import {
  CHANNEL_LABELS,
  FIELD_TYPE_LABELS,
  formatAudience,
  INTERACTION_ICON_COMPONENTS,
  InteractionStateBadge,
} from 'components/notification/NotificationDisplay'
import { Download, Loader2, Lock } from 'lucide-react'
import { downloadCSV } from 'utils/csv'
import { formatDisplayDateTime } from 'utils/date'
import { mapInAppNavigationTypeToLabel } from 'utils/link'

import type {
  AdminListNotificationResponsesResponse,
  AdminSentNotificationDetail,
  BannerInAppType,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'
import { apiErrorMessage } from '~/libs/api-error'

import { Route } from './route'

type Interaction = NonNullable<AdminSentNotificationDetail['interaction']>
type ResponseRow = AdminListNotificationResponsesResponse['data'][number]

/** An answer value as people read it: option labels, not option ids. */
const formatValue = (
  field: Interaction['fields'][number],
  value: string | string[] | undefined
) => {
  if (value === undefined) return ''
  if (field.type === 'text') return Array.isArray(value) ? value.join(', ') : value
  const label = (id: string) => field.options.find((o) => o.id === id)?.label ?? id
  return Array.isArray(value) ? value.map(label).join(', ') : label(value)
}

const actionLabel = (interaction: Interaction, actionId: string) =>
  interaction.actions.find((a) => a.id === actionId)?.label ?? actionId

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2 text-sm">
    <span className="text-base-text-medium">{label}</span>
    <div className="min-w-0 break-words">{children}</div>
  </div>
)

const LinkSummary = ({ link }: { link: AdminSentNotificationDetail['link'] }) => {
  if (!link) return <>-</>
  switch (link.type) {
    case 'EXTERNAL_BROWSER':
      return (
        <a href={link.destination} target="_blank" rel="noreferrer" className="hover:underline">
          {link.destination}
        </a>
      )
    case 'MINI_APP':
      return (
        <>
          Mini App: {link.destination}
          {link.bypassNotificationCenter && ' (ข้ามหน้ารายละเอียด)'}
        </>
      )
    case 'IN_APP_NAVIGATION':
      return (
        <>
          {link.inAppType === 'MINI_APP_INVITE'
            ? link.inAppType
            : mapInAppNavigationTypeToLabel(link.inAppType as BannerInAppType)}
          {link.inAppId && ` · ${link.inAppId}`}
          {link.bypassNotificationCenter && ' (ข้ามหน้ารายละเอียด)'}
        </>
      )
  }
}

const ResponsesTable = ({
  notificationId,
  interaction,
}: {
  notificationId: string
  interaction: Interaction
}) => {
  const [queryLimit, setQueryLimit] = useState(20)
  const [queryPage, setQueryPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const query = reactQueryClient.useQuery(
    '/admin/notifications/sent/:id/responses',
    { pathParams: { id: notificationId }, query: { page: queryPage, limit: queryLimit } },
    { placeholderData: keepPreviousData }
  )

  const columns = useMemo(
    () =>
      [
        {
          id: 'user',
          header: 'ผู้ตอบ',
          cell: ({ row }) => (
            <Link
              to="/user/$userId"
              params={{ userId: row.original.user.id }}
              className="hover:underline"
            >
              {row.original.user.name}
            </Link>
          ),
        },
        { id: 'phone', header: 'เบอร์โทร', cell: ({ row }) => row.original.user.phoneNumber },
        {
          id: 'action',
          header: 'คำตอบ',
          cell: ({ row }) => actionLabel(interaction, row.original.actionId),
        },
        ...interaction.fields.map(
          (field): ColumnDef<ResponseRow> => ({
            id: `field:${field.id}`,
            header: field.label,
            cell: ({ row }) => (
              <span className="whitespace-pre-line">
                {formatValue(field, row.original.values?.[field.id])}
              </span>
            ),
          })
        ),
        {
          id: 'channel',
          header: 'ช่องทาง',
          cell: ({ row }) => CHANNEL_LABELS[row.original.channel],
        },
        {
          id: 'respondedAt',
          header: 'ตอบเมื่อ',
          cell: ({ row }) => formatDisplayDateTime(row.original.respondedAt),
        },
      ] satisfies ColumnDef<ResponseRow>[],
    [interaction]
  )

  // Every answer, a thousand per request, so a large poll exports in a few calls.
  const exportCsv = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      const rows: ResponseRow[] = []
      for (let page = 1; ; page++) {
        const result = await queryClient.fetchQuery(
          reactQueryClient.queryOptions('/admin/notifications/sent/:id/responses', {
            pathParams: { id: notificationId },
            query: { page, limit: 1000 },
          })
        )
        rows.push(...result.data)
        if (rows.length >= result.meta.count || result.data.length === 0) break
      }
      const fieldHeaders = interaction.fields.map((f, i) => `${i + 1}. ${f.label}`)
      const headers = [
        'ชื่อ',
        'เบอร์โทร',
        'คำตอบ',
        ...fieldHeaders,
        'ช่องทาง',
        'ตอบเมื่อ',
        'User ID',
      ]
      downloadCSV(
        headers,
        rows.map((row) => ({
          ชื่อ: row.user.name,
          เบอร์โทร: row.user.phoneNumber,
          คำตอบ: actionLabel(interaction, row.actionId),
          ...Object.fromEntries(
            interaction.fields.map((f, i) => [fieldHeaders[i], formatValue(f, row.values?.[f.id])])
          ),
          ช่องทาง: CHANNEL_LABELS[row.channel],
          ตอบเมื่อ: formatDisplayDateTime(row.respondedAt),
          'User ID': row.user.id,
        })),
        `notification-${notificationId}-responses.csv`
      )
    } catch (error) {
      setExportError(apiErrorMessage(error) ?? 'ส่งออกไม่สำเร็จ')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Typography variant="h3" className="mr-auto">
          คำตอบ ({(query.data?.meta.count ?? 0).toLocaleString()})
        </Typography>
        {exportError && <span className="text-sm text-system-danger-default">{exportError}</span>}
        <Button
          className="gap-2"
          variant="outline"
          onClick={exportCsv}
          disabled={isExporting || (query.data?.meta.count ?? 0) === 0}
        >
          {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
          ส่งออก CSV
        </Button>
      </div>
      <DataTable
        columns={columns as never}
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
    </Card>
  )
}

export const Data = () => {
  const { notificationId } = Route.useParams()
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)
  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/notifications/sent/:id', {
    pathParams: { id: notificationId },
  })
  const closeMutation = reactQueryClient.useMutation('post', '/admin/notifications/sent/:id/close')

  const notification = query.data
  const interaction = notification?.interaction

  const closeInteraction = () =>
    confirmDialogRef.current?.confirm({
      title: 'ปิดรับคำตอบ?',
      description:
        'ผู้ที่ยังไม่ได้ตอบจะตอบไม่ได้อีก และ Live Activity จะถูกปิด คำตอบที่ได้รับแล้วยังอยู่ครบ',
      onConfirm: () =>
        closeMutation.mutate(
          { pathParams: { id: notificationId } },
          {
            onSuccess: () =>
              queryClient.invalidateQueries({
                queryKey: reactQueryClient.getQueryKey('/admin/notifications/sent/:id', {
                  pathParams: { id: notificationId },
                }),
              }),
          }
        ),
    })

  return (
    <div className="px-6 pb-6 space-y-4">
      <Breadcrumb className="pt-4 pb-2">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/notification">แจ้งเตือน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{notification?.title ?? notificationId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {query.isLoading && <Loader2 className="animate-spin" />}
      {query.isError && (
        <p className="text-system-danger-default">
          {apiErrorMessage(query.error) ?? 'ไม่พบการแจ้งเตือนนี้'}
        </p>
      )}

      {notification && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Typography variant="h1" className="mr-auto">
              {notification.title}
            </Typography>
            <InteractionStateBadge state={notification.interactionState} />
            {notification.interactionState === 'OPEN' && (
              <Button
                className="gap-2"
                variant="outline-destructive"
                onClick={closeInteraction}
                disabled={closeMutation.isPending}
              >
                <Lock />
                ปิดรับคำตอบ
              </Button>
            )}
          </div>
          {closeMutation.isError && (
            <p className="text-sm text-system-danger-default">
              {apiErrorMessage(closeMutation.error) ?? 'ปิดรับคำตอบไม่สำเร็จ'}
            </p>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <Card className="p-6 space-y-3">
              <Typography variant="h3">เนื้อหา</Typography>
              <Row label="หัวข้อ">{notification.title}</Row>
              <Row label="ข้อความ">
                <span className="whitespace-pre-line">{notification.message}</span>
              </Row>
              {notification.image && (
                <Row label="รูปภาพ">
                  <img src={notification.image} alt="" className="max-h-48 rounded-lg" />
                </Row>
              )}
              <Row label="ลิงก์">
                <LinkSummary link={notification.link} />
              </Row>
              {notification.actionButtonText && (
                <Row label="ข้อความบนปุ่มลิงก์">{notification.actionButtonText}</Row>
              )}
            </Card>

            <Card className="p-6 space-y-3">
              <Typography variant="h3">การส่ง</Typography>
              <Row label="ผู้รับ">{formatAudience(notification.audience)}</Row>
              <Row label="จำนวนผู้รับ">{notification.recipientCount.toLocaleString()} คน</Row>
              <Row label="เปิดอ่านแล้ว">{notification.readCount.toLocaleString()} คน</Row>
              <Row label="ส่งโดย">{notification.sentBy?.name ?? '-'}</Row>
              <Row label="ส่งเมื่อ">{formatDisplayDateTime(notification.createdAt)}</Row>
              <Row label="ID">
                <code className="text-xs">{notification.id}</code>
              </Row>
            </Card>
          </div>

          {interaction && (
            <>
              <Card className="p-6 space-y-3">
                <Typography variant="h3">แบบฟอร์ม</Typography>
                <Row label="ปิดรับคำตอบ">
                  {interaction.closedAt
                    ? `ปิดแล้วเมื่อ ${formatDisplayDateTime(interaction.closedAt)}`
                    : interaction.expiresAt
                      ? formatDisplayDateTime(interaction.expiresAt)
                      : 'ไม่กำหนด'}
                </Row>
                <Row label="ตัวเลือกการตอบ">
                  {[
                    interaction.tray ? 'ปุ่มบนการแจ้งเตือน' : 'ตอบในแอปเท่านั้น',
                    interaction.liveActivity && 'Live Activity (iOS)',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Row>
                {interaction.fields.length > 0 && (
                  <Row label="ช่องกรอก">
                    <ol className="list-decimal pl-4 space-y-1">
                      {interaction.fields.map((field) => (
                        <li key={field.id}>
                          {field.label}{' '}
                          <span className="text-base-text-medium">
                            ({FIELD_TYPE_LABELS[field.type]}
                            {field.required && ', ต้องตอบ'}
                            {field.type !== 'text' &&
                              `: ${field.options.map((o) => o.label).join(', ')}`}
                            )
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Row>
                )}
                <Row label="ผลการตอบ">
                  <div className="flex flex-wrap gap-2">
                    {interaction.actionCounts.map(({ actionId, count }) => {
                      const action = interaction.actions.find((a) => a.id === actionId)
                      const Icon = action?.icon ? INTERACTION_ICON_COMPONENTS[action.icon] : null
                      return (
                        <span
                          key={actionId}
                          className="inline-flex items-center gap-1 rounded-lg border border-base-outline-default px-3 py-1"
                        >
                          {Icon && <Icon className="size-4" />}
                          {action?.label ?? actionId}
                          <b className="ml-1">{count.toLocaleString()}</b>
                        </span>
                      )
                    })}
                    <span className="inline-flex items-center px-1 text-base-text-medium">
                      ยังไม่ตอบ{' '}
                      {Math.max(
                        0,
                        notification.recipientCount - notification.responseCount
                      ).toLocaleString()}
                    </span>
                  </div>
                </Row>
              </Card>
              <ResponsesTable notificationId={notificationId} interaction={interaction} />
            </>
          )}
        </>
      )}
      <ConfirmDialog ref={confirmDialogRef} />
    </div>
  )
}

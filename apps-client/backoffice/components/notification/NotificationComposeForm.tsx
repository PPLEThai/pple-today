import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/web-ui/alert-dialog'
import { Button } from '@pple-today/web-ui/button'
import { Card } from '@pple-today/web-ui/card'
import { Form } from '@pple-today/web-ui/form'
import { Typography } from '@pple-today/web-ui/typography'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Send } from 'lucide-react'
import { handleUploadFile } from 'utils/file-upload'

import type {
  AdminCountNotificationAudienceResponse,
  AdminSendNotificationResponse,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'
import { apiErrorMessage } from '~/libs/api-error'

import {
  NOTIFICATION_FORM_DEFAULTS,
  NotificationFormSchema,
  type NotificationFormValues,
  toAudience,
  toSendBody,
} from './notification-form'
import { NotificationAudienceSection } from './NotificationAudienceSection'
import { NotificationContentSection } from './NotificationContentSection'
import { NotificationInteractionSection } from './NotificationInteractionSection'
import { NotificationPreview } from './NotificationPreview'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-6 space-y-4">
    <Typography variant="h3">{title}</Typography>
    {children}
  </Card>
)

export const NotificationComposeForm = () => {
  const navigate = useNavigate()
  const form = useForm<NotificationFormValues>({
    resolver: standardSchemaResolver(NotificationFormSchema),
    defaultValues: NOTIFICATION_FORM_DEFAULTS,
  })

  const countMutation = reactQueryClient.useMutation('post', '/admin/notifications/audience-count')
  const uploadUrlMutation = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const sendMutation = reactQueryClient.useMutation('post', '/admin/notifications/send')

  const [pending, setPending] = useState<{
    values: NotificationFormValues
    count: AdminCountNotificationAudienceResponse
  } | null>(null)
  const [sent, setSent] = useState<AdminSendNotificationResponse | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const onValid = async (values: NotificationFormValues) => {
    setSendError(null)
    try {
      const count = await countMutation.mutateAsync({ body: { audience: toAudience(values) } })
      setPending({ values, count })
    } catch (error) {
      setSendError(apiErrorMessage(error) ?? 'ตรวจสอบผู้รับไม่สำเร็จ')
    }
  }

  const confirmSend = async () => {
    if (!pending) return
    setIsSending(true)
    setSendError(null)
    try {
      let imageFilePath: `temp/${string}` | undefined
      const image = pending.values.imageFile
      if (image) {
        const upload = await uploadUrlMutation.mutateAsync({
          body: { category: 'NOTIFICATION', contentType: image.type as 'image/png' },
        })
        await handleUploadFile(image, upload.uploadUrl, upload.uploadFields)
        imageFilePath = upload.filePath as `temp/${string}`
      }
      const result = await sendMutation.mutateAsync({
        body: toSendBody(pending.values, imageFilePath),
      })
      setPending(null)
      setSent(result)
    } catch (error) {
      setPending(null)
      setSendError(apiErrorMessage(error) ?? 'ส่งการแจ้งเตือนไม่สำเร็จ')
    } finally {
      setIsSending(false)
    }
  }

  const failedNumbers = sent?.phoneNumber?.failed ?? []

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start"
      >
        <div className="space-y-6 min-w-0">
          <Section title="ผู้รับ">
            <NotificationAudienceSection />
          </Section>
          <Section title="เนื้อหา">
            <NotificationContentSection />
          </Section>
          <Section title="แบบฟอร์มตอบกลับ">
            <NotificationInteractionSection />
          </Section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <Card className="p-6">
            <NotificationPreview />
          </Card>
          {sendError && (
            <p className="rounded-lg border border-system-danger-default bg-system-danger-extra-light p-3 text-sm text-system-danger-default">
              {sendError}
            </p>
          )}
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="text-sm text-system-danger-default">กรุณาแก้ไขข้อมูลที่ไม่ถูกต้อง</p>
          )}
          <Button type="submit" className="w-full" disabled={countMutation.isPending || isSending}>
            {countMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            ส่งการแจ้งเตือน
          </Button>
          <p className="text-xs text-base-text-medium">
            ส่งในนาม PPLE Today · ตรวจสอบก่อนส่ง การแจ้งเตือนที่ส่งแล้วยกเลิกไม่ได้
          </p>
        </div>
      </form>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !isSending && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Typography variant="h3">ยืนยันการส่งการแจ้งเตือน</Typography>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-base-text-high">
                <p>
                  “{pending?.values.header}” จะถูกส่งถึงผู้ใช้{' '}
                  <b>{pending?.count.userCount.toLocaleString()}</b> คน (รับการแจ้งเตือนบนมือถือได้{' '}
                  {pending?.count.pushReachableCount.toLocaleString()} คน)
                </p>
                {pending?.count.userCount === 0 && (
                  <p className="text-system-danger-default">
                    ไม่พบผู้ใช้ตามเงื่อนไขนี้
                    {pending.values.smsEnabled
                      ? ' จะส่งเฉพาะ SMS'
                      : ' จะไม่มีใครได้รับการแจ้งเตือน'}
                  </p>
                )}
                {pending?.values.interactionEnabled && (
                  <p>มีแบบฟอร์มตอบกลับ คำตอบจะเก็บไว้ในหน้ารายละเอียด</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending}
              onClick={(e) => {
                e.preventDefault()
                confirmSend()
              }}
            >
              {isSending && <Loader2 className="animate-spin" />}
              ส่ง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sent !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Typography variant="h3">ส่งการแจ้งเตือนแล้ว</Typography>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-base-text-high">
                <p>ส่งถึงผู้ใช้ {sent?.recipientCount.toLocaleString()} คน</p>
                {failedNumbers.length > 0 && (
                  <div>
                    <p>
                      ไม่พบบัญชีของเบอร์ต่อไปนี้ ({failedNumbers.length.toLocaleString()} เบอร์):
                    </p>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-base-bg-light p-2 text-xs">
                      {failedNumbers.join('\n')}
                    </pre>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                sent &&
                navigate({
                  to: '/notification/$notificationId',
                  params: { notificationId: sent.notificationId },
                })
              }
            >
              ดูรายละเอียด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}

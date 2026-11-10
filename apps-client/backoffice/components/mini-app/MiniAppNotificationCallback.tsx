import { ReactNode, useRef, useState } from 'react'

import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/web-ui/dialog'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { AlertTriangle, Info, RefreshCw, Send } from 'lucide-react'

import { MiniApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { CopyButton } from './MiniAppNotificationKeys'

interface MiniAppNotificationCallbackProps {
  trigger: ReactNode
  miniApp: MiniApp
}

type TestResult = { statusCode: number | null; error: string | null }

/**
 * Where an ADMIN app's answers to interactive notifications are POSTed.
 * The signing secret is returned once (when the URL is first saved, or on
 * rotate) and is never readable again, so it is held in local state only.
 */
export const MiniAppNotificationCallback = (props: MiniAppNotificationCallbackProps) => {
  const { miniApp } = props
  const [isOpen, setIsOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const pathParams = { id: miniApp.id }
  const query = reactQueryClient.useQuery(
    '/admin/mini-app/:id/notification-callback',
    { pathParams },
    { enabled: isOpen }
  )
  const saveMutation = reactQueryClient.useMutation(
    'put',
    '/admin/mini-app/:id/notification-callback'
  )
  const clearMutation = reactQueryClient.useMutation(
    'delete',
    '/admin/mini-app/:id/notification-callback'
  )
  const rotateMutation = reactQueryClient.useMutation(
    'post',
    '/admin/mini-app/:id/notification-callback/secret'
  )
  const testMutation = reactQueryClient.useMutation(
    'post',
    '/admin/mini-app/:id/notification-callback/test'
  )

  const savedUrl = query.data?.url ?? null
  const hasSecret = query.data?.hasSecret ?? false
  const url = urlDraft ?? savedUrl ?? ''
  const isDirty = url.trim() !== (savedUrl ?? '')

  const handleOpenChange = (state: boolean) => {
    if (!state) {
      setUrlDraft(null)
      setRevealedSecret(null)
      setErrorMessage(null)
      setTestResult(null)
    }
    setIsOpen(state)
  }

  const onError = (fallback: string) => (error: unknown) => {
    const message = (error as { value?: { error?: { message?: string } } } | null)?.value?.error
      ?.message
    setErrorMessage(message ?? fallback)
  }

  const save = () => {
    const value = url.trim()
    if (!value || saveMutation.isPending) return
    setErrorMessage(null)
    setTestResult(null)
    saveMutation.mutate(
      { pathParams, body: { url: value } },
      {
        onSuccess: (result) => {
          if (result.secret) setRevealedSecret(result.secret)
          setUrlDraft(null)
          query.refetch()
        },
        onError: onError(
          'บันทึกไม่สำเร็จ กรุณาตรวจสอบ URL (ต้องเป็น https และเข้าถึงได้จากอินเทอร์เน็ต)'
        ),
      }
    )
  }

  const rotate = () => {
    confirmDialogRef.current?.confirm({
      title: 'หมุนรหัสลับสำหรับลงลายเซ็นหรือไม่?',
      description:
        'รหัสลับเดิมจะใช้ไม่ได้ทันที ระบบจะแสดงรหัสใหม่เพียงครั้งเดียว แอปของคุณต้องเปลี่ยนไปใช้รหัสใหม่เพื่อตรวจลายเซ็นให้ผ่าน',
      onConfirm: () => {
        if (rotateMutation.isPending) return
        setErrorMessage(null)
        rotateMutation.mutate(
          { pathParams },
          {
            onSuccess: (result) => setRevealedSecret(result.secret),
            onError: onError('หมุนรหัสลับไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
          }
        )
      },
    })
  }

  const clear = () => {
    confirmDialogRef.current?.confirm({
      title: 'ลบ Callback URL หรือไม่?',
      description:
        'รหัสลับจะถูกลบด้วย คำตอบที่ยังส่งไม่สำเร็จจะรอจนกว่าจะตั้ง URL ใหม่ (ระบบลองส่งซ้ำได้ไม่เกิน 7 ครั้ง)',
      onConfirm: () => {
        if (clearMutation.isPending) return
        setErrorMessage(null)
        clearMutation.mutate(
          { pathParams },
          {
            onSuccess: () => {
              setUrlDraft(null)
              setRevealedSecret(null)
              setTestResult(null)
              query.refetch()
            },
            onError: onError('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
          }
        )
      },
    })
  }

  const sendTest = () => {
    if (testMutation.isPending) return
    setErrorMessage(null)
    setTestResult(null)
    testMutation.mutate(
      { pathParams },
      {
        onSuccess: (result) => setTestResult(result),
        onError: onError('ส่งอีเวนต์ทดสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
      }
    )
  }

  const isTestOk =
    testResult?.statusCode !== null &&
    testResult?.statusCode !== undefined &&
    testResult.statusCode >= 200 &&
    testResult.statusCode < 300

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent cardClassName="max-w-xl">
        <div className="flex flex-col gap-1.5">
          <DialogTitle asChild>
            <Typography variant="h3">Callback การตอบแจ้งเตือน — {miniApp.name}</Typography>
          </DialogTitle>
          <DialogDescription className="text-sm text-base-text-medium leading-tight">
            เมื่อผู้ใช้ตอบการแจ้งเตือนแบบโต้ตอบของแอปนี้ ระบบจะส่งคำตอบ (POST) มาที่ URL นี้
            พร้อมลายเซ็น <code>X-PPLE-Signature</code> ที่คำนวณด้วยรหัสลับด้านล่าง
          </DialogDescription>
        </div>

        <div className="flex gap-2 rounded-md border border-base-outline-default bg-base-bg-light p-3 text-sm">
          <Info className="size-4 shrink-0 text-base-text-medium" />
          <span className="text-base-text-high leading-tight">
            URL ต้องเป็น https และเข้าถึงได้จากอินเทอร์เน็ตเท่านั้น (ไม่รองรับ localhost
            หรือเครือข่ายภายใน) แอปควรตรวจลายเซ็นและปฏิเสธคำขอที่ timestamp ห่างเกิน 5 นาที
          </span>
        </div>

        {errorMessage && (
          <div className="flex gap-2 rounded-md border border-system-danger-border bg-system-danger-background p-3 text-sm text-system-danger-default">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {revealedSecret && (
          <div className="flex flex-col gap-2 rounded-md border border-system-danger-border bg-system-danger-background p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-system-danger-default">
              <AlertTriangle className="size-4 shrink-0" />
              คัดลอกรหัสลับนี้ทันที ระบบจะไม่แสดงอีก
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-base-bg-medium px-2 py-1.5 font-mono text-xs">
                {revealedSecret}
              </code>
              <CopyButton value={revealedSecret} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="text-sm font-medium">
            Callback URL
          </Typography>
          <div className="flex gap-2">
            <Input
              value={url}
              disabled={query.isLoading}
              onChange={(ev) => setUrlDraft(ev.target.value)}
              placeholder="https://example.com/pple/notification-response"
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault()
                  save()
                }
              }}
            />
            <Button
              className="shrink-0"
              disabled={!url.trim() || !isDirty || saveMutation.isPending}
              onClick={save}
            >
              บันทึก
            </Button>
          </div>
        </div>

        {savedUrl && (
          <>
            <div className="flex items-center gap-2 rounded-md border border-base-outline-default p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">รหัสลับสำหรับลงลายเซ็น</span>
                  {hasSecret ? (
                    <Badge variant="outline">ตั้งค่าแล้ว</Badge>
                  ) : (
                    <Badge variant="secondary">ยังไม่มี</Badge>
                  )}
                </div>
                <span className="text-xs text-base-text-medium">
                  แสดงเพียงครั้งเดียวตอนสร้างหรือหมุน ดูย้อนหลังไม่ได้
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                disabled={rotateMutation.isPending}
                onClick={rotate}
              >
                <RefreshCw className="size-4" />
                หมุนรหัสลับ
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t border-base-outline-default pt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-1"
                  disabled={testMutation.isPending || isDirty}
                  onClick={sendTest}
                >
                  <Send className="size-4" />
                  ส่งอีเวนต์ทดสอบ
                </Button>
                <Button
                  variant="outline-destructive"
                  className="ml-auto"
                  disabled={clearMutation.isPending}
                  onClick={clear}
                >
                  ลบ URL
                </Button>
              </div>
              {testResult && (
                <div
                  className={
                    isTestOk
                      ? 'rounded-md border border-base-outline-default p-3 text-sm'
                      : 'rounded-md border border-system-danger-border bg-system-danger-background p-3 text-sm text-system-danger-default'
                  }
                >
                  {testResult.statusCode !== null
                    ? `แอปตอบกลับ HTTP ${testResult.statusCode}${isTestOk ? ' — สำเร็จ' : ' — ไม่สำเร็จ'}`
                    : `ส่งไม่สำเร็จ: ${testResult.error ?? 'ไม่ทราบสาเหตุ'}`}
                </div>
              )}
              {isDirty && (
                <span className="text-xs text-base-text-medium">
                  บันทึก URL ก่อนจึงจะส่งอีเวนต์ทดสอบได้
                </span>
              )}
            </div>
          </>
        )}
      </DialogContent>
      <ConfirmDialog ref={confirmDialogRef} />
    </Dialog>
  )
}

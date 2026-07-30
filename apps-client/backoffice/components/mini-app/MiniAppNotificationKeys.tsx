import { ReactNode, useCallback, useMemo, useRef, useState } from 'react'

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
import { Popover, PopoverAnchor, PopoverContent } from '@pple-today/web-ui/popover'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import dayjs from 'dayjs'
import { AlertTriangle, Check, Copy, KeyRound, RefreshCw } from 'lucide-react'

import { MiniApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

/**
 * Whether an app's icon can be fetched by FCM for the OS push. A null icon or a
 * base64 `data:` URI cannot, and leaves the notification carrying the app name
 * only — the same rule the push-payload builder applies (see
 * docs/app-bound-notifications.md). We test the `iconUrl` the app row already
 * carries so ops can spot affected apps without opening each one.
 */
export const isPushIconUsable = (iconUrl: string | null | undefined): boolean =>
  !!iconUrl && !iconUrl.startsWith('data:')

interface MiniAppNotificationKeysProps {
  trigger: ReactNode
  miniApp: MiniApp
}

export const MiniAppNotificationKeys = (props: MiniAppNotificationKeysProps) => {
  const { miniApp } = props
  const [isOpen, setIsOpen] = useState(false)
  // The plaintext key is returned once, on create or rotate, and never again.
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const confirmDialogRef = useRef<ConfirmDialogRef>(null)
  const queryClient = useQueryClient()

  // limit high enough that a single app's keys never paginate — there is no
  // pagination control here, and per-app keys stay in the low single digits.
  const listQueryArgs = useMemo(
    () => ({ query: { miniAppId: miniApp.id, limit: 100 } }),
    [miniApp.id]
  )
  const query = reactQueryClient.useQuery('/admin/notifications/api-key', listQueryArgs, {
    enabled: isOpen,
  })

  const createMutation = reactQueryClient.useMutation('post', '/admin/notifications/api-key')
  const rotateMutation = reactQueryClient.useMutation(
    'post',
    '/admin/notifications/api-key/:id/generate'
  )
  const updateMutation = reactQueryClient.useMutation('patch', '/admin/notifications/api-key/:id')

  const invalidateKeys = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/notifications/api-key', listQueryArgs),
    })
  }, [queryClient, listQueryArgs])

  const onMutationError = useCallback(() => {
    setErrorMessage('ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  }, [])

  const handleOpenChange = (state: boolean) => {
    if (!state) {
      setRevealedKey(null)
      setNewKeyName('')
      setErrorMessage(null)
    }
    setIsOpen(state)
  }

  const createKey = () => {
    const name = newKeyName.trim()
    if (!name || createMutation.isPending) return
    setErrorMessage(null)
    createMutation.mutate(
      { body: { name, miniAppId: miniApp.id } },
      {
        onSuccess: (result) => {
          setRevealedKey(result.apiKey)
          setNewKeyName('')
          invalidateKeys()
        },
        onError: onMutationError,
      }
    )
  }

  const rotateKey = (id: string, name: string) => {
    confirmDialogRef.current?.confirm({
      title: `หมุนคีย์ "${name}" หรือไม่?`,
      description:
        'คีย์เดิมจะใช้งานไม่ได้ทันที และระบบจะแสดงคีย์ใหม่เพียงครั้งเดียว การเชื่อมต่อที่ยังใช้คีย์เดิมอยู่จะส่งการแจ้งเตือนไม่ได้จนกว่าจะเปลี่ยนไปใช้คีย์ใหม่',
      onConfirm: () => {
        if (rotateMutation.isPending) return
        setErrorMessage(null)
        rotateMutation.mutate(
          { pathParams: { id } },
          {
            onSuccess: (result) => {
              setRevealedKey(result.apiKey)
              invalidateKeys()
            },
            onError: onMutationError,
          }
        )
      },
    })
  }

  const setKeyActive = (id: string, active: boolean) => {
    if (updateMutation.isPending) return
    setErrorMessage(null)
    updateMutation.mutate(
      { pathParams: { id }, body: { active } },
      { onSuccess: () => invalidateKeys(), onError: onMutationError }
    )
  }

  const deactivateKey = (id: string, name: string) => {
    confirmDialogRef.current?.confirm({
      title: `ปิดใช้งานคีย์ "${name}" หรือไม่?`,
      description:
        'เมื่อปิดใช้งานแล้ว คีย์นี้จะส่งการแจ้งเตือนไม่ได้อีก แต่ยังสามารถเปิดใช้งานใหม่ได้ภายหลัง',
      onConfirm: () => setKeyActive(id, false),
    })
  }

  const keys = query.data ?? []
  const iconUsable = isPushIconUsable(miniApp.iconUrl)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent cardClassName="max-w-xl">
        <div className="flex flex-col gap-1.5">
          <DialogTitle asChild>
            <Typography variant="h3">คีย์การแจ้งเตือน — {miniApp.name}</Typography>
          </DialogTitle>
          <DialogDescription className="text-sm text-base-text-medium leading-tight">
            คีย์ที่สร้างจากหน้านี้จะผูกกับแอปนี้
            การแจ้งเตือนที่ส่งด้วยคีย์นี้จะแสดงชื่อและไอคอนของแอป
          </DialogDescription>
        </div>

        {!iconUsable && (
          <div className="flex gap-2 rounded-md border border-system-warning-border bg-system-warning-background p-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-system-warning-default" />
            <span className="text-base-text-high leading-tight">
              แอปนี้ไม่มีไอคอนที่ใช้ในการแจ้งเตือนได้ (ไม่มีไอคอน หรือเป็นไฟล์แบบ base64)
              การแจ้งเตือนจะแสดง<strong>เฉพาะชื่อแอป</strong>โดยไม่มีไอคอนในหน้าจอแจ้งเตือนของระบบ
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="flex gap-2 rounded-md border border-system-danger-border bg-system-danger-background p-3 text-sm text-system-danger-default">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {revealedKey && (
          <div className="flex flex-col gap-2 rounded-md border border-system-danger-border bg-system-danger-background p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-system-danger-default">
              <AlertTriangle className="size-4 shrink-0" />
              คัดลอกคีย์นี้ทันที ระบบจะไม่แสดงอีก
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-base-bg-medium px-2 py-1.5 font-mono text-xs">
                {revealedKey}
              </code>
              <CopyButton value={revealedKey} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="text-sm font-medium">
            คีย์ของแอปนี้
          </Typography>
          {query.isLoading ? (
            <div className="rounded-md border border-base-outline-default p-4 text-center text-sm text-base-text-medium">
              กำลังโหลด…
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-md border border-base-outline-default p-4 text-center text-sm text-base-text-medium">
              ยังไม่มีคีย์สำหรับแอปนี้
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center gap-2 rounded-md border border-base-outline-default p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{key.name}</span>
                      {key.active ? (
                        <Badge variant="outline">ใช้งานอยู่</Badge>
                      ) : (
                        <Badge variant="secondary">ปิดใช้งาน</Badge>
                      )}
                    </div>
                    <span className="text-xs text-base-text-medium">
                      สร้างเมื่อ {dayjs(key.createdAt).format('DD/MM/YYYY')}
                    </span>
                  </div>
                  {key.active ? (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={rotateMutation.isPending}
                        onClick={() => rotateKey(key.id, key.name)}
                      >
                        <span className="sr-only">หมุนคีย์</span>
                        <RefreshCw className="size-4" />
                      </Button>
                      <Button
                        variant="outline-destructive"
                        size="sm"
                        className="h-8"
                        disabled={updateMutation.isPending}
                        onClick={() => deactivateKey(key.id, key.name)}
                      >
                        ปิดใช้งาน
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      disabled={updateMutation.isPending}
                      onClick={() => setKeyActive(key.id, true)}
                    >
                      เปิดใช้งาน
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-base-outline-default pt-4">
          <Typography variant="h4" className="text-sm font-medium">
            สร้างคีย์ใหม่
          </Typography>
          <div className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(ev) => setNewKeyName(ev.target.value)}
              placeholder="ชื่อคีย์ (เช่น ชื่อการเชื่อมต่อ)"
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault()
                  createKey()
                }
              }}
            />
            <Button
              className="shrink-0 gap-1"
              disabled={!newKeyName.trim() || createMutation.isPending}
              onClick={createKey}
            >
              <KeyRound className="size-4" />
              สร้างคีย์
            </Button>
          </div>
        </div>
      </DialogContent>
      <ConfirmDialog ref={confirmDialogRef} />
    </Dialog>
  )
}

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const copy = async () => {
    try {
      await window.navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    } finally {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Popover open={copied}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={copy}
          aria-label="คัดลอกคีย์"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </PopoverAnchor>
      <PopoverContent side="top" className="w-fit p-2 text-sm">
        คัดลอกแล้ว
      </PopoverContent>
    </Popover>
  )
}

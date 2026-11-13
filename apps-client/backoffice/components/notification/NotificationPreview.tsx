import { useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { Typography } from '@pple-today/web-ui/typography'
import { cn } from '@pple-today/web-ui/utils'

import type { NotificationFormValues } from './notification-form'
import { INTERACTION_ICON_COMPONENTS } from './NotificationDisplay'

const ACTION_CLASSES = {
  primary: 'bg-base-primary-default text-base-text-invert',
  outline: 'border border-base-outline-default text-base-text-high',
  destructive: 'bg-system-danger-default text-base-text-invert',
} as const

/** A rough phone rendering of the push and the detail screen. Not pixel-exact. */
export const NotificationPreview = () => {
  const form = useFormContext<NotificationFormValues>()
  const values = useWatch({ control: form.control }) as NotificationFormValues

  const imageUrl = useMemo(
    () => (values.imageFile instanceof File ? URL.createObjectURL(values.imageFile) : undefined),
    [values.imageFile]
  )
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    },
    [imageUrl]
  )

  const header = values.header?.trim() || 'หัวข้อการแจ้งเตือน'
  const message = values.message?.trim() || 'ข้อความการแจ้งเตือน'
  const interaction = values.interactionEnabled
  const showLinkButton = values.linkKind !== 'NONE'

  return (
    <div className="space-y-4">
      <div>
        <Typography variant="small" className="mb-2 block text-base-text-medium">
          การแจ้งเตือนบนมือถือ
        </Typography>
        <div className="rounded-2xl bg-base-bg-medium p-3 flex gap-3">
          <img src="/pple-icon.svg" alt="" className="size-9 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs text-base-text-medium">
              <span>PPLE Today</span>
              <span>ตอนนี้</span>
            </div>
            <p className="font-semibold text-sm truncate">{header}</p>
            <p className="text-sm line-clamp-2 whitespace-pre-line">{message}</p>
          </div>
          {imageUrl && <img src={imageUrl} alt="" className="size-10 rounded object-cover" />}
        </div>
      </div>

      <div>
        <Typography variant="small" className="mb-2 block text-base-text-medium">
          หน้ารายละเอียด
          {values.bypassNotificationCenter && !interaction && showLinkButton && (
            <> · (ข้ามไปเปิดลิงก์ทันที)</>
          )}
        </Typography>
        <div className="rounded-2xl border border-base-outline-default p-4 space-y-3">
          <p className="font-semibold">{header}</p>
          {imageUrl && <img src={imageUrl} alt="" className="w-full rounded-lg" />}
          <p className="text-sm whitespace-pre-line">{message}</p>

          {interaction && (
            <div className="space-y-3 rounded-xl bg-base-bg-light p-3">
              {values.fields?.map((field, i) => (
                <div key={field.key ?? i} className="space-y-1">
                  <p className="text-sm font-medium">
                    {field.label || `ช่องที่ ${i + 1}`}
                    {field.required && <span className="text-system-danger-default"> *</span>}
                  </p>
                  {field.description && (
                    <p className="text-xs text-base-text-medium">{field.description}</p>
                  )}
                  {field.type === 'text' ? (
                    <div
                      className={cn(
                        'rounded-md border border-base-outline-default bg-base-bg-white px-2 text-xs text-base-text-placeholder',
                        field.multiline ? 'h-14 py-1' : 'h-8 flex items-center'
                      )}
                    >
                      {field.placeholder}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {field.options?.map((option, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <span
                            className={cn(
                              'size-3.5 border border-base-outline-dark',
                              field.type === 'radio' ? 'rounded-full' : 'rounded-sm'
                            )}
                          />
                          {option.label || `ตัวเลือกที่ ${j + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-2">
                {values.actions?.map((action, i) => {
                  const Icon =
                    action.icon && action.icon !== 'none'
                      ? INTERACTION_ICON_COMPONENTS[action.icon]
                      : null
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex h-9 items-center justify-center gap-1 rounded-lg text-sm font-medium',
                        ACTION_CLASSES[action.style ?? 'primary']
                      )}
                    >
                      {Icon && <Icon className="size-4" />}
                      {action.label || `ปุ่มที่ ${i + 1}`}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {showLinkButton && (
            <div className="flex h-9 items-center justify-center rounded-lg border border-base-outline-default text-sm">
              {values.actionButtonText?.trim() || 'เปิดลิงก์'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

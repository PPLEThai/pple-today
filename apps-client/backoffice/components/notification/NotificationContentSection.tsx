import { useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { Button } from '@pple-today/web-ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pple-today/web-ui/select'
import { Switch } from '@pple-today/web-ui/switch'
import { Textarea } from '@pple-today/web-ui/textarea'
import { BannerInAppTypeSelect } from 'components/feed/BannerInAppTypeSelect'
import { FileUploadInput } from 'components/FileUploadInput'
import { Trash2 } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES } from 'utils/file-upload'
import { inAppNavigationRequiresId } from 'utils/in-app-navigation-types'

import { reactQueryClient } from '~/libs/api-client'

import type { LinkKind, NotificationFormValues } from './notification-form'

const LINK_KIND_LABELS: Record<LinkKind, string> = {
  NONE: 'ไม่มีลิงก์',
  IN_APP_NAVIGATION: 'หน้าในแอป',
  MINI_APP: 'Mini App',
  EXTERNAL_BROWSER: 'ลิงก์ภายนอก (เปิดในเบราว์เซอร์)',
}

const Required = () => <span className="text-system-danger-default">*</span>

export const NotificationContentSection = () => {
  const form = useFormContext<NotificationFormValues>()
  const linkKind = useWatch({ control: form.control, name: 'linkKind' })
  const inAppType = useWatch({ control: form.control, name: 'inAppType' })
  const interactionEnabled = useWatch({ control: form.control, name: 'interactionEnabled' })
  const header = useWatch({ control: form.control, name: 'header' })
  const message = useWatch({ control: form.control, name: 'message' })
  const elFileInput = useRef<HTMLInputElement | null>(null)

  const miniAppQuery = reactQueryClient.useQuery(
    '/admin/mini-app',
    {},
    { enabled: linkKind === 'MINI_APP' }
  )

  const bypassAvailable = linkKind === 'IN_APP_NAVIGATION' || linkKind === 'MINI_APP'

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="header"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              หัวข้อ <Required />
            </FormLabel>
            <FormControl>
              <Input {...field} maxLength={200} placeholder="หัวข้อการแจ้งเตือน" />
            </FormControl>
            <FormDescription>{header.length}/200</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              ข้อความ <Required />
            </FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} maxLength={2000} placeholder="รายละเอียดการแจ้งเตือน" />
            </FormControl>
            <FormDescription>{message.length}/2000</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="imageFile"
        render={({ field: { onChange, value, ref, ...field } }) => (
          <FormItem>
            <FormLabel>รูปภาพ</FormLabel>
            <div className="flex gap-2 min-w-0">
              <FormControl>
                <FileUploadInput fileName={value?.name} preview={value}>
                  <Input
                    type="file"
                    {...field}
                    ref={(el) => {
                      elFileInput.current = el
                      ref(el)
                    }}
                    onChange={(ev) =>
                      onChange(ev.target.files?.length ? ev.target.files[0] : undefined)
                    }
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  />
                </FileUploadInput>
              </FormControl>
              {value && (
                <Button
                  className="shrink-0"
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="ลบรูปภาพ"
                  onClick={() => {
                    onChange(undefined)
                    if (elFileInput.current) elFileInput.current.value = ''
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <FormDescription>JPG / PNG ไม่เกิน 5 MB</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="linkKind"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ลิงก์</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(Object.keys(LINK_KIND_LABELS) as LinkKind[]).map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {LINK_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {linkKind === 'IN_APP_NAVIGATION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="inAppType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ปลายทาง <Required />
                </FormLabel>
                <FormControl>
                  <BannerInAppTypeSelect value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {inAppType && inAppNavigationRequiresId(inAppType) && (
            <FormField
              control={form.control}
              name="inAppId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ID <Required />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ID ของเนื้อหา" />
                  </FormControl>
                  <FormDescription>
                    เนื้อหาต้องเผยแพร่อยู่ ไม่เช่นนั้นจะส่งไม่สำเร็จ
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}

      {linkKind === 'MINI_APP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="miniAppId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mini App <Required />
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือก Mini App" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Retired apps are already left out of this list. */}
                    {miniAppQuery.data?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  ลิงก์ไปยังแอป ไม่ได้ส่งในนามแอป (การแจ้งเตือนยังแสดงเป็น PPLE Today)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="miniAppPath"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Path ในแอป</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="/ (หน้าแรกของแอป)" />
                </FormControl>
                <FormDescription>เช่น /events/123 · เว้นว่างเพื่อเปิดหน้าแรก</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {linkKind === 'EXTERNAL_BROWSER' && (
        <FormField
          control={form.control}
          name="externalUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                URL <Required />
              </FormLabel>
              <FormControl>
                <Input {...field} type="url" placeholder="https://" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {linkKind !== 'NONE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="actionButtonText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ข้อความบนปุ่มลิงก์</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={40} placeholder="เช่น ดูรายละเอียด" />
                </FormControl>
                <FormDescription>แสดงในหน้ารายละเอียดการแจ้งเตือน</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {bypassAvailable && (
            <FormField
              control={form.control}
              name="bypassNotificationCenter"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value && !interactionEnabled}
                        onCheckedChange={field.onChange}
                        disabled={interactionEnabled}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">ข้ามหน้ารายละเอียดการแจ้งเตือน</FormLabel>
                  </div>
                  <FormDescription>
                    {interactionEnabled
                      ? 'ใช้ไม่ได้เมื่อมีแบบฟอร์ม เพราะแบบฟอร์มอยู่ในหน้ารายละเอียด'
                      : 'แตะการแจ้งเตือนแล้วเปิดลิงก์ทันที แทนการเปิดหน้ารายละเอียด'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

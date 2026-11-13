import { useMemo } from 'react'
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
import { Label } from '@pple-today/web-ui/label'
import { MultiSelect } from '@pple-today/web-ui/multi-select'
import { RadioGroup, RadioGroupItem } from '@pple-today/web-ui/radio-group'
import { Switch } from '@pple-today/web-ui/switch'
import { Textarea } from '@pple-today/web-ui/textarea'
import { cn } from '@pple-today/web-ui/utils'
import { Loader2, Users } from 'lucide-react'

import { reactQueryClient } from '~/libs/api-client'
import { apiErrorMessage } from '~/libs/api-error'

import {
  type AudienceMode,
  MAX_PHONE_NUMBERS,
  type NotificationFormValues,
  parsePhoneNumberList,
  toAudience,
} from './notification-form'

const AUDIENCE_OPTIONS: { value: AudienceMode; label: string; description: string }[] = [
  { value: 'PHONE_SINGLE', label: 'รายบุคคล', description: 'ส่งถึงเบอร์โทร 1 เบอร์' },
  {
    value: 'PHONE_LIST',
    label: 'รายชื่อเบอร์โทร',
    description: 'วางรายการเบอร์โทร บรรทัดละ 1 เบอร์',
  },
  { value: 'ROLE', label: 'ตามบทบาท', description: 'ผู้ที่มีบทบาทใดบทบาทหนึ่งที่เลือก' },
  {
    value: 'ADDRESS',
    label: 'ตามพื้นที่',
    description: 'ผู้ที่อยู่ในจังหวัดหรืออำเภอ/เขตที่เลือก',
  },
  { value: 'BROADCAST', label: 'ทุกคน', description: 'ผู้ใช้ PPLE Today ทุกคน' },
]

export const NotificationAudienceSection = () => {
  const form = useFormContext<NotificationFormValues>()
  const mode = useWatch({ control: form.control, name: 'audienceMode' })
  const phoneNumberList = useWatch({ control: form.control, name: 'phoneNumberList' })
  const smsEnabled = useWatch({ control: form.control, name: 'smsEnabled' })
  const isPhone = mode === 'PHONE_SINGLE' || mode === 'PHONE_LIST'

  const rolesQuery = reactQueryClient.useQuery('/admin/notifications/roles', {})
  const provinceQuery = reactQueryClient.useQuery('/admin/address/province', {})
  const districtQuery = reactQueryClient.useQuery('/admin/address/district', { query: {} })
  const countMutation = reactQueryClient.useMutation('post', '/admin/notifications/audience-count')

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? []).map((r) => ({
        value: r.role,
        label: `${r.role} (${r.userCount.toLocaleString()})`,
      })),
    [rolesQuery.data]
  )
  const provinceOptions = useMemo(
    () => (provinceQuery.data ?? []).map((p) => ({ value: p, label: p })),
    [provinceQuery.data]
  )
  const districtOptions = useMemo(
    () => Array.from(new Set(districtQuery.data ?? [])).map((d) => ({ value: d, label: d })),
    [districtQuery.data]
  )

  const listStats = useMemo(() => parsePhoneNumberList(phoneNumberList), [phoneNumberList])

  const countAudience = async () => {
    const fields = {
      ROLE: ['roles'],
      ADDRESS: ['provinces'],
      PHONE_SINGLE: ['phoneNumber'],
      PHONE_LIST: ['phoneNumberList'],
      BROADCAST: [],
    } as const
    const valid = await form.trigger([...fields[mode]])
    if (!valid) return
    countMutation.mutate({ body: { audience: toAudience(form.getValues()) } })
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="audienceMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              ส่งถึง <span className="text-system-danger-default">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  countMutation.reset()
                }}
                className="grid grid-cols-1 md:grid-cols-5 gap-2"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`audience-${option.value}`}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border border-base-outline-default p-3 cursor-pointer',
                      field.value === option.value && 'border-base-primary-default bg-base-bg-light'
                    )}
                  >
                    <RadioGroupItem
                      id={`audience-${option.value}`}
                      value={option.value}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs text-base-text-medium font-normal leading-tight">
                        {option.description}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {mode === 'PHONE_SINGLE' && (
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                เบอร์โทร <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} inputMode="tel" placeholder="0812345678" className="max-w-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {mode === 'PHONE_LIST' && (
        <FormField
          control={form.control}
          name="phoneNumberList"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                รายการเบอร์โทร <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={8}
                  className="font-mono"
                  placeholder={'0812345678\n0898765432\n+66861234567'}
                />
              </FormControl>
              <FormDescription>
                บรรทัดละ 1 เบอร์ สูงสุด {MAX_PHONE_NUMBERS.toLocaleString()} เบอร์ · ถูกต้อง{' '}
                {listStats.valid.length.toLocaleString()} เบอร์
                {listStats.invalid.length > 0 && (
                  <span className="text-system-danger-default">
                    {' '}
                    · ไม่ถูกต้อง {listStats.invalid.length.toLocaleString()} เบอร์
                  </span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {mode === 'ROLE' && (
        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                บทบาท <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <MultiSelect
                  options={roleOptions}
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                  placeholder={rolesQuery.isLoading ? 'กำลังโหลด…' : 'เลือกบทบาท'}
                  maxCount={5}
                />
              </FormControl>
              <FormDescription>ตัวเลขในวงเล็บคือจำนวนผู้ใช้ที่มีบทบาทนั้น</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {mode === 'ADDRESS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provinces"
            render={({ field }) => (
              <FormItem>
                <FormLabel>จังหวัด</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={provinceOptions}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder="เลือกจังหวัด (ทั้งจังหวัด)"
                    maxCount={5}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="districts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>อำเภอ/เขต</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={districtOptions}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder="เลือกอำเภอ/เขต"
                    maxCount={5}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormDescription className="md:col-span-2">
            ส่งถึงผู้ที่ที่อยู่ในบัญชีตรงกับจังหวัด <b>หรือ</b> อำเภอ/เขตใดก็ได้ที่เลือก
            (เลือกจังหวัดเพื่อส่งทั้งจังหวัด)
          </FormDescription>
        </div>
      )}

      {mode === 'BROADCAST' && (
        <p className="rounded-lg border border-system-warning-default bg-system-warning-light p-3 text-sm">
          การแจ้งเตือนนี้จะถูกส่งถึงผู้ใช้ PPLE Today <b>ทุกคน</b>
        </p>
      )}

      {isPhone && (
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="smsEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">ส่ง SMS สำรอง</FormLabel>
              </FormItem>
            )}
          />
          {smsEnabled && (
            <FormField
              control={form.control}
              name="smsFallbackText"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} rows={2} maxLength={500} placeholder="ข้อความ SMS" />
                  </FormControl>
                  <FormDescription>
                    ส่งให้เบอร์ที่ไม่มีบัญชี PPLE Today หรือไม่ได้เปิดรับการแจ้งเตือน (
                    {field.value.length}/500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={countAudience}
          disabled={countMutation.isPending}
        >
          {countMutation.isPending ? <Loader2 className="animate-spin" /> : <Users />}
          ตรวจสอบจำนวนผู้รับ
        </Button>
        {countMutation.data && (
          <span className="text-sm">
            พบผู้ใช้ <b>{countMutation.data.userCount.toLocaleString()}</b> คน ·
            รับการแจ้งเตือนบนมือถือได้{' '}
            <b>{countMutation.data.pushReachableCount.toLocaleString()}</b> คน
          </span>
        )}
        {countMutation.isError && (
          <span className="text-sm text-system-danger-default">
            {apiErrorMessage(countMutation.error) ?? 'นับจำนวนไม่สำเร็จ'}
          </span>
        )}
      </div>
    </div>
  )
}

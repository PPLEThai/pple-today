import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'

import { Button } from '@pple-today/web-ui/button'
import { Card } from '@pple-today/web-ui/card'
import { Checkbox } from '@pple-today/web-ui/checkbox'
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
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DateTimePicker'
import { ArrowDown, ArrowUp, CirclePlus, Trash2, X } from 'lucide-react'

import {
  defaultAction,
  defaultField,
  INTERACTION_ICONS,
  INTERACTION_LIMITS,
  type InteractionFieldForm,
  liveActivityBlocker,
  type NotificationFormValues,
} from './notification-form'
import {
  ACTION_STYLE_LABELS,
  FIELD_TYPE_LABELS,
  INTERACTION_ICON_COMPONENTS,
  INTERACTION_ICON_LABELS,
} from './NotificationDisplay'

const Required = () => <span className="text-system-danger-default">*</span>

const FieldOptions = ({ index }: { index: number }) => {
  const form = useFormContext<NotificationFormValues>()
  const type = useWatch({ control: form.control, name: `fields.${index}.type` })
  const options = useFieldArray({ control: form.control, name: `fields.${index}.options` })
  const [, max] =
    type === 'radio' ? INTERACTION_LIMITS.radioOptions : INTERACTION_LIMITS.checkboxOptions
  const [min] =
    type === 'radio' ? INTERACTION_LIMITS.radioOptions : INTERACTION_LIMITS.checkboxOptions

  return (
    <div className="space-y-2">
      <FormLabel>
        ตัวเลือก <Required />
      </FormLabel>
      {options.fields.map((option, optionIndex) => (
        <FormField
          key={option.id}
          control={form.control}
          name={`fields.${index}.options.${optionIndex}.label`}
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    {...field}
                    maxLength={INTERACTION_LIMITS.optionLabel}
                    placeholder={`ตัวเลือกที่ ${optionIndex + 1}`}
                  />
                </FormControl>
                {options.fields.length > min && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="ลบตัวเลือก"
                    onClick={() => options.remove(optionIndex)}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <FormField
        control={form.control}
        name={`fields.${index}.options`}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
      {options.fields.length < max && (
        <Button
          className="gap-1.5"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => options.append({ label: '' })}
        >
          <CirclePlus /> เพิ่มตัวเลือก
        </Button>
      )}
    </div>
  )
}

const FieldEditor = ({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
}) => {
  const form = useFormContext<NotificationFormValues>()
  const type = useWatch({ control: form.control, name: `fields.${index}.type` })

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Typography variant="small" className="mr-auto">
          ช่องที่ {index + 1} · {FIELD_TYPE_LABELS[type]}
        </Typography>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="เลื่อนขึ้น"
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="เลื่อนลง"
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDown />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="ลบช่อง" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`fields.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                คำถาม <Required />
              </FormLabel>
              <FormControl>
                <Input {...field} maxLength={INTERACTION_LIMITS.fieldLabel} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`fields.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>คำอธิบาย</FormLabel>
              <FormControl>
                <Input {...field} maxLength={INTERACTION_LIMITS.fieldDescription} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {type === 'text' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <FormField
            control={form.control}
            name={`fields.${index}.placeholder`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>ข้อความตัวอย่างในช่อง</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={INTERACTION_LIMITS.placeholder} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`fields.${index}.maxLength`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>ความยาวสูงสุด (ตัวอักษร)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={INTERACTION_LIMITS.maxLength}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`fields.${index}.multiline`}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 pb-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">หลายบรรทัด</FormLabel>
              </FormItem>
            )}
          />
        </div>
      )}
      {(type === 'radio' || type === 'checkbox') && <FieldOptions index={index} />}
      <FormField
        control={form.control}
        name={`fields.${index}.required`}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">ต้องตอบทุกครั้ง</FormLabel>
          </FormItem>
        )}
      />
    </Card>
  )
}

const ActionEditor = ({
  index,
  canRemove,
  onRemove,
}: {
  index: number
  canRemove: boolean
  onRemove: () => void
}) => {
  const form = useFormContext<NotificationFormValues>()
  const fields = useWatch({ control: form.control, name: 'fields' })
  const confirm = useWatch({ control: form.control, name: `actions.${index}.confirm` })
  // A field required for every action needs no per-action requirement.
  const optionalFields = fields.filter((f) => !f.required)

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Typography variant="small" className="mr-auto">
          ปุ่มที่ {index + 1}
        </Typography>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" aria-label="ลบปุ่ม" onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name={`actions.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                ข้อความบนปุ่ม <Required />
              </FormLabel>
              <FormControl>
                <Input {...field} maxLength={INTERACTION_LIMITS.actionLabel} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`actions.${index}.icon`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ไอคอน</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">ไม่มีไอคอน</SelectItem>
                  {INTERACTION_ICONS.map((icon) => {
                    const Icon = INTERACTION_ICON_COMPONENTS[icon]
                    return (
                      <SelectItem key={icon} value={icon}>
                        <Icon className="size-4" /> {INTERACTION_ICON_LABELS[icon]}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`actions.${index}.style`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>รูปแบบ</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(ACTION_STYLE_LABELS) as (keyof typeof ACTION_STYLE_LABELS)[]).map(
                    (style) => (
                      <SelectItem key={style} value={style}>
                        {ACTION_STYLE_LABELS[style]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {optionalFields.length > 0 && (
        <FormField
          control={form.control}
          name={`actions.${index}.requires`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ช่องที่ต้องกรอกเมื่อกดปุ่มนี้</FormLabel>
              <div className="flex flex-wrap gap-4">
                {optionalFields.map((f) => {
                  const position = fields.indexOf(f) + 1
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(f.key)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, f.key]
                              : field.value.filter((key) => key !== f.key)
                          )
                        }
                      />
                      {f.label || `ช่องที่ ${position}`}
                    </label>
                  )
                })}
              </div>
              <FormDescription>เช่น ต้องกรอกเหตุผลเมื่อกด “ไม่อนุมัติ” เท่านั้น</FormDescription>
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name={`actions.${index}.confirm`}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">ถามยืนยันก่อนส่ง</FormLabel>
          </FormItem>
        )}
      />
      {confirm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name={`actions.${index}.confirmTitle`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  หัวข้อการยืนยัน <Required />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ยืนยันคำตอบ?" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`actions.${index}.confirmMessage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>ข้อความการยืนยัน</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ตอบแล้วแก้ไขไม่ได้" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </Card>
  )
}

export const NotificationInteractionSection = () => {
  const form = useFormContext<NotificationFormValues>()
  const enabled = useWatch({ control: form.control, name: 'interactionEnabled' })
  const watched = useWatch({ control: form.control, name: ['fields', 'tray', 'expiresAt'] })
  const fieldArray = useFieldArray({ control: form.control, name: 'fields', keyName: 'rhfId' })
  const actionArray = useFieldArray({ control: form.control, name: 'actions' })

  const blocker = liveActivityBlocker({
    fields: watched[0],
    tray: watched[1],
    expiresAt: watched[2],
  })

  const addField = (type: InteractionFieldForm['type']) => fieldArray.append(defaultField(type))

  const removeField = (index: number) => {
    const key = form.getValues(`fields.${index}.key`)
    fieldArray.remove(index)
    // Drop the removed field from every action that required it.
    form.getValues('actions').forEach((action, i) => {
      if (action.requires.includes(key)) {
        form.setValue(
          `actions.${i}.requires`,
          action.requires.filter((k) => k !== key)
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="interactionEnabled"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">แนบแบบฟอร์มให้ผู้รับตอบกลับ</FormLabel>
            </div>
            <FormDescription>
              ผู้รับตอบได้ครั้งเดียวจากในแอปหรือจากการแจ้งเตือน คำตอบเก็บไว้ที่นี่
              ดูได้ในหน้ารายละเอียดของการแจ้งเตือน
            </FormDescription>
          </FormItem>
        )}
      />

      {enabled && (
        <>
          <div className="space-y-3">
            <Typography variant="h4">ช่องกรอก</Typography>
            <p className="text-sm text-base-text-medium">
              ไม่บังคับ สูงสุด {INTERACTION_LIMITS.fields} ช่อง ไม่มีช่องกรอก =
              ตอบด้วยการกดปุ่มอย่างเดียว
            </p>
            {fieldArray.fields.map((f, index) => (
              <FieldEditor
                key={f.rhfId}
                index={index}
                count={fieldArray.fields.length}
                onMove={(to) => fieldArray.move(index, to)}
                onRemove={() => removeField(index)}
              />
            ))}
            {fieldArray.fields.length < INTERACTION_LIMITS.fields && (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FIELD_TYPE_LABELS) as InteractionFieldForm['type'][]).map((type) => (
                  <Button
                    className="gap-1.5"
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addField(type)}
                  >
                    <CirclePlus /> {FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Typography variant="h4">ปุ่มตอบ</Typography>
            <p className="text-sm text-base-text-medium">
              1–{INTERACTION_LIMITS.actions} ปุ่ม เช่น “ไป” / “ไม่ไป” หรือ “ส่ง” ใต้ช่องกรอก
            </p>
            {actionArray.fields.map((a, index) => (
              <ActionEditor
                key={a.id}
                index={index}
                canRemove={actionArray.fields.length > 1}
                onRemove={() => actionArray.remove(index)}
              />
            ))}
            <FormField
              control={form.control}
              name="actions"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />
            {actionArray.fields.length < INTERACTION_LIMITS.actions && (
              <Button
                className="gap-1.5"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => actionArray.append(defaultAction(actionArray.fields.length))}
              >
                <CirclePlus /> เพิ่มปุ่ม
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <Typography variant="h4">การตอบกลับ</Typography>
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ปิดรับคำตอบเมื่อ</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="ไม่กำหนด (ปิดเองได้ภายหลัง)"
                        className="w-full md:w-80"
                      />
                    </FormControl>
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="ล้างเวลา"
                        onClick={() => field.onChange(undefined)}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    ไม่เกิน {INTERACTION_LIMITS.expiresInDays} วัน ·
                    ปิดรับคำตอบก่อนเวลาได้จากหน้ารายละเอียด
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tray"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">แสดงปุ่มตอบบนการแจ้งเตือน</FormLabel>
                  </div>
                  <FormDescription>
                    ตอบได้โดยไม่ต้องเปิดแอป (iOS กดค้างที่การแจ้งเตือน)
                    แบบฟอร์มที่ซับซ้อนจะเปิดแอปแทน
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="liveActivity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!field.value && blocker !== null}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Live Activity (iOS)</FormLabel>
                  </div>
                  <FormDescription>
                    {blocker ??
                      'แสดงปุ่มตอบบนหน้าจอล็อกและ Dynamic Island ของ iPhone ที่รองรับ เหมาะกับคำถามเร่งด่วน'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </div>
  )
}

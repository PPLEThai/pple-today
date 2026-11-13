import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from 'utils/file-upload'
import { inAppNavigationRequiresId } from 'utils/in-app-navigation-types'
import z from 'zod'

import type {
  AdminNotificationAudience,
  AdminSendNotificationBody,
  NotificationInteractionIcon,
} from '@api/backoffice/admin'

/**
 * Mirrors `NOTIFICATION_INTERACTION_ICONS` in api-common. Restated rather than
 * imported because importing the value would pull Elysia into the bundle; the
 * two `satisfies` checks below fail the build if the lists drift.
 */
export const INTERACTION_ICONS = [
  'check',
  'x',
  'thumbs-up',
  'thumbs-down',
  'calendar-check',
  'calendar-x',
  'clock',
  'send',
  'heart',
  'star',
  'flag',
  'user-check',
  'user-x',
  'help',
] as const satisfies readonly NotificationInteractionIcon[]
type _IconsCoverAll = NotificationInteractionIcon extends (typeof INTERACTION_ICONS)[number]
  ? true
  : never
export const _iconsCoverAll: _IconsCoverAll = true

/** Mirrors `ADMIN_NOTIFICATION_MAX_PHONE_NUMBERS` on the API. */
export const MAX_PHONE_NUMBERS = 10000

/** Limits from docs/interactive-notifications.md, checked here so the form can point at the field. */
export const INTERACTION_LIMITS = {
  fields: 5,
  actions: 3,
  fieldLabel: 80,
  fieldDescription: 200,
  placeholder: 80,
  maxLength: 1000,
  defaultMaxLength: 500,
  radioOptions: [2, 10],
  checkboxOptions: [1, 10],
  optionLabel: 60,
  actionLabel: 24,
  expiresInDays: 30,
  liveActivityHours: 8,
} as const

export type AudienceMode = 'BROADCAST' | 'ROLE' | 'ADDRESS' | 'PHONE_SINGLE' | 'PHONE_LIST'
export type LinkKind = 'NONE' | 'IN_APP_NAVIGATION' | 'MINI_APP' | 'EXTERNAL_BROWSER'

/** A client-side key that survives reordering, so `requires` can point at a field. */
export const newKey = () => Math.random().toString(36).slice(2, 10)

const FieldSchema = z.object({
  key: z.string(),
  type: z.enum(['text', 'radio', 'checkbox']),
  label: z.string().trim().min(1, 'กรุณากรอกชื่อช่อง').max(INTERACTION_LIMITS.fieldLabel),
  description: z.string().max(INTERACTION_LIMITS.fieldDescription),
  required: z.boolean(),
  placeholder: z.string().max(INTERACTION_LIMITS.placeholder),
  multiline: z.boolean(),
  maxLength: z.number().int().min(1).max(INTERACTION_LIMITS.maxLength),
  options: z.array(
    z.object({
      label: z.string().trim().min(1, 'กรุณากรอกตัวเลือก').max(INTERACTION_LIMITS.optionLabel),
    })
  ),
})
export type InteractionFieldForm = z.infer<typeof FieldSchema>

const ActionSchema = z.object({
  label: z.string().trim().min(1, 'กรุณากรอกชื่อปุ่ม').max(INTERACTION_LIMITS.actionLabel),
  icon: z.union([z.enum(INTERACTION_ICONS), z.literal('none')]),
  style: z.enum(['primary', 'outline', 'destructive']),
  /** Field keys this action needs filled in, on top of required fields. */
  requires: z.array(z.string()),
  confirm: z.boolean(),
  confirmTitle: z.string(),
  confirmMessage: z.string(),
})
export type InteractionActionForm = z.infer<typeof ActionSchema>

export const NotificationFormSchema = z
  .object({
    audienceMode: z.enum(['BROADCAST', 'ROLE', 'ADDRESS', 'PHONE_SINGLE', 'PHONE_LIST']),
    roles: z.array(z.string()),
    provinces: z.array(z.string()),
    districts: z.array(z.string()),
    phoneNumber: z.string(),
    phoneNumberList: z.string(),
    smsEnabled: z.boolean(),
    smsFallbackText: z.string().max(500),

    header: z.string().trim().min(1, 'กรุณากรอกหัวข้อ').max(200),
    message: z.string().trim().min(1, 'กรุณากรอกข้อความ').max(2000),
    imageFile: z
      .instanceof(File)
      .refine((file) => file.size <= MAX_FILE_SIZE, 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB')
      .refine(
        (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
        'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG'
      )
      .optional(),

    linkKind: z.enum(['NONE', 'IN_APP_NAVIGATION', 'MINI_APP', 'EXTERNAL_BROWSER']),
    inAppType: z.string(),
    inAppId: z.string(),
    miniAppId: z.string(),
    miniAppPath: z.string(),
    externalUrl: z.string(),
    actionButtonText: z.string().max(40),
    bypassNotificationCenter: z.boolean(),

    interactionEnabled: z.boolean(),
    fields: z.array(FieldSchema).max(INTERACTION_LIMITS.fields),
    actions: z.array(ActionSchema),
    expiresAt: z.date().optional(),
    tray: z.boolean(),
    liveActivity: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message })

    switch (data.audienceMode) {
      case 'ROLE':
        if (data.roles.length === 0) issue(['roles'], 'กรุณาเลือกอย่างน้อย 1 บทบาท')
        break
      case 'ADDRESS':
        if (data.provinces.length === 0 && data.districts.length === 0) {
          issue(['provinces'], 'กรุณาเลือกจังหวัดหรืออำเภอ/เขตอย่างน้อย 1 แห่ง')
        }
        break
      case 'PHONE_SINGLE':
        if (!isThaiMobile(data.phoneNumber)) {
          issue(['phoneNumber'], 'กรุณากรอกเบอร์มือถือ เช่น 0812345678')
        }
        break
      case 'PHONE_LIST': {
        const { valid, invalid } = parsePhoneNumberList(data.phoneNumberList)
        if (invalid.length > 0) {
          issue(
            ['phoneNumberList'],
            `เบอร์ไม่ถูกต้อง ${invalid.length} รายการ: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? ', …' : ''}`
          )
        } else if (valid.length === 0) {
          issue(['phoneNumberList'], 'กรุณากรอกเบอร์อย่างน้อย 1 เบอร์ (บรรทัดละ 1 เบอร์)')
        } else if (valid.length > MAX_PHONE_NUMBERS) {
          issue(
            ['phoneNumberList'],
            `ส่งได้สูงสุด ${MAX_PHONE_NUMBERS.toLocaleString()} เบอร์ต่อครั้ง`
          )
        }
        break
      }
    }

    const isPhone = data.audienceMode === 'PHONE_SINGLE' || data.audienceMode === 'PHONE_LIST'
    if (isPhone && data.smsEnabled && data.smsFallbackText.trim().length === 0) {
      issue(['smsFallbackText'], 'กรุณากรอกข้อความ SMS')
    }

    switch (data.linkKind) {
      case 'IN_APP_NAVIGATION':
        if (!data.inAppType) issue(['inAppType'], 'กรุณาเลือกปลายทาง')
        else if (inAppNavigationRequiresId(data.inAppType) && !data.inAppId.trim()) {
          issue(['inAppId'], 'กรุณากรอก ID')
        }
        break
      case 'MINI_APP':
        if (!data.miniAppId) issue(['miniAppId'], 'กรุณาเลือก Mini App')
        if (data.miniAppPath.trim() && !/^\/(?!\/)[^?#\\]*$/.test(data.miniAppPath.trim())) {
          issue(['miniAppPath'], 'ต้องขึ้นต้นด้วย / และไม่มี ? หรือ #')
        }
        break
      case 'EXTERNAL_BROWSER':
        if (!/^https?:\/\/\S+$/.test(data.externalUrl.trim())) {
          issue(['externalUrl'], 'กรุณากรอก URL ที่ขึ้นต้นด้วย https://')
        }
        break
    }

    if (!data.interactionEnabled) return

    // `bypassNotificationCenter` is not checked here: the switch is disabled while
    // a form is attached, and `toLink` drops a value left over from before.

    data.fields.forEach((field, i) => {
      if (field.type === 'radio') {
        const [min, max] = INTERACTION_LIMITS.radioOptions
        if (field.options.length < min || field.options.length > max) {
          issue(['fields', i, 'options'], `ตัวเลือกแบบเลือกได้ 1 ข้อ ต้องมี ${min}–${max} ตัวเลือก`)
        }
      }
      if (field.type === 'checkbox') {
        const [min, max] = INTERACTION_LIMITS.checkboxOptions
        if (field.options.length < min || field.options.length > max) {
          issue(
            ['fields', i, 'options'],
            `ตัวเลือกแบบเลือกได้หลายข้อ ต้องมี ${min}–${max} ตัวเลือก`
          )
        }
      }
    })

    if (data.actions.length < 1 || data.actions.length > INTERACTION_LIMITS.actions) {
      issue(['actions'], `ต้องมีปุ่มตอบ 1–${INTERACTION_LIMITS.actions} ปุ่ม`)
    }
    data.actions.forEach((action, i) => {
      if (action.confirm && !action.confirmTitle.trim()) {
        issue(['actions', i, 'confirmTitle'], 'กรุณากรอกหัวข้อการยืนยัน')
      }
    })

    const now = Date.now()
    if (data.expiresAt) {
      if (data.expiresAt.getTime() <= now) issue(['expiresAt'], 'ต้องเป็นเวลาในอนาคต')
      else if (data.expiresAt.getTime() > now + INTERACTION_LIMITS.expiresInDays * 86_400_000) {
        issue(['expiresAt'], `ตั้งได้ไม่เกิน ${INTERACTION_LIMITS.expiresInDays} วัน`)
      }
    }

    if (data.liveActivity) {
      const reason = liveActivityBlocker(data)
      if (reason) issue(['liveActivity'], reason)
    }
  })

export type NotificationFormValues = z.infer<typeof NotificationFormSchema>

export const defaultField = (type: InteractionFieldForm['type']): InteractionFieldForm => ({
  key: newKey(),
  type,
  label: '',
  description: '',
  required: false,
  placeholder: '',
  multiline: false,
  maxLength: INTERACTION_LIMITS.defaultMaxLength,
  options:
    type === 'radio' ? [{ label: '' }, { label: '' }] : type === 'checkbox' ? [{ label: '' }] : [],
})

export const defaultAction = (index: number): InteractionActionForm => ({
  label: index === 0 ? 'ส่ง' : '',
  icon: 'none',
  style: index === 0 ? 'primary' : 'outline',
  requires: [],
  confirm: false,
  confirmTitle: '',
  confirmMessage: '',
})

export const NOTIFICATION_FORM_DEFAULTS: NotificationFormValues = {
  audienceMode: 'PHONE_SINGLE',
  roles: [],
  provinces: [],
  districts: [],
  phoneNumber: '',
  phoneNumberList: '',
  smsEnabled: false,
  smsFallbackText: '',
  header: '',
  message: '',
  imageFile: undefined,
  linkKind: 'NONE',
  inAppType: '',
  inAppId: '',
  miniAppId: '',
  miniAppPath: '',
  externalUrl: '',
  actionButtonText: '',
  bypassNotificationCenter: false,
  interactionEnabled: false,
  fields: [],
  actions: [defaultAction(0)],
  expiresAt: undefined,
  tray: true,
  liveActivity: false,
}

// The same rule as the API (`isThaiMobileE164` after `normalizeThaiPhoneNumber`).
const THAI_MOBILE = /^(?:0|\+66)\d{9}$/

const compactPhone = (value: string) => value.replace(/[\s-]/g, '')

/** A complete Thai mobile, 0XXXXXXXXX or +66XXXXXXXXX; spaces and dashes are ignored. */
export const isThaiMobile = (value: string) => THAI_MOBILE.test(compactPhone(value.trim()))

/** One number per line; blank lines are skipped. The server deduplicates. */
export const parsePhoneNumberList = (value: string) => {
  const valid: string[] = []
  const invalid: string[] = []
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (isThaiMobile(trimmed)) valid.push(compactPhone(trimmed))
    else invalid.push(trimmed)
  }
  return { valid, invalid }
}

/**
 * Why this form cannot be a Live Activity, or null when it can. A Live
 * Activity shows buttons only, so it needs a buttons-only form, tray actions on,
 * and an expiry within 8 hours (iOS ends an activity after that).
 */
export const liveActivityBlocker = (
  data: Pick<NotificationFormValues, 'fields' | 'tray' | 'expiresAt'>
) => {
  if (data.fields.length > 0)
    return 'Live Activity ใช้ได้กับแบบฟอร์มที่มีแต่ปุ่มตอบ (ไม่มีช่องกรอก)'
  if (!data.tray) return 'ต้องเปิดปุ่มตอบบนการแจ้งเตือน'
  if (!data.expiresAt)
    return `ต้องกำหนดเวลาปิดรับคำตอบภายใน ${INTERACTION_LIMITS.liveActivityHours} ชั่วโมง`
  if (data.expiresAt.getTime() > Date.now() + INTERACTION_LIMITS.liveActivityHours * 3_600_000) {
    return `เวลาปิดรับคำตอบต้องไม่เกิน ${INTERACTION_LIMITS.liveActivityHours} ชั่วโมงจากตอนนี้`
  }
  return null
}

export const toAudience = (data: NotificationFormValues): AdminNotificationAudience => {
  switch (data.audienceMode) {
    case 'BROADCAST':
      return { type: 'BROADCAST' }
    case 'ROLE':
      return { type: 'ROLE', roles: data.roles }
    case 'ADDRESS':
      return { type: 'ADDRESS', provinces: data.provinces, districts: data.districts }
    case 'PHONE_SINGLE':
      return { type: 'PHONE_NUMBER', phoneNumbers: [compactPhone(data.phoneNumber.trim())] }
    case 'PHONE_LIST':
      return {
        type: 'PHONE_NUMBER',
        phoneNumbers: parsePhoneNumberList(data.phoneNumberList).valid,
      }
  }
}

const toLink = (data: NotificationFormValues): AdminSendNotificationBody['link'] => {
  // Bypass is not offered with a form: the form lives on the detail screen.
  const bypass = !data.interactionEnabled && data.bypassNotificationCenter ? true : undefined
  switch (data.linkKind) {
    case 'NONE':
      return undefined
    case 'EXTERNAL_BROWSER':
      return { type: 'EXTERNAL_BROWSER', url: data.externalUrl.trim() }
    case 'IN_APP_NAVIGATION':
      return {
        type: 'IN_APP_NAVIGATION',
        inAppType: data.inAppType as never,
        inAppId: inAppNavigationRequiresId(data.inAppType) ? data.inAppId.trim() : undefined,
        bypassNotificationCenter: bypass,
      }
    case 'MINI_APP':
      return {
        type: 'MINI_APP',
        miniAppId: data.miniAppId,
        path: data.miniAppPath.trim() || undefined,
        bypassNotificationCenter: bypass,
      }
  }
}

const blankToUndefined = (value: string) => (value.trim() ? value.trim() : undefined)

const toInteraction = (data: NotificationFormValues): AdminSendNotificationBody['interaction'] => {
  if (!data.interactionEnabled) return undefined

  // Ids are positional: the answer table and the export read labels from the
  // stored spec, so nobody sees them.
  const fieldId = new Map(data.fields.map((field, i) => [field.key, `field_${i + 1}`]))

  return {
    expiresAt: data.expiresAt?.toISOString(),
    tray: data.tray,
    liveActivity: data.liveActivity || undefined,
    fields: data.fields.map((field) => {
      const base = {
        id: fieldId.get(field.key)!,
        label: field.label.trim(),
        description: blankToUndefined(field.description),
        required: field.required || undefined,
      }
      const options = field.options.map((o, i) => ({ id: `opt_${i + 1}`, label: o.label.trim() }))
      switch (field.type) {
        case 'text':
          return {
            ...base,
            type: 'text' as const,
            placeholder: blankToUndefined(field.placeholder),
            multiline: field.multiline || undefined,
            maxLength: field.maxLength,
          }
        case 'radio':
          return { ...base, type: 'radio' as const, options }
        case 'checkbox':
          return { ...base, type: 'checkbox' as const, options }
      }
    }),
    actions: data.actions.map((action, i) => ({
      id: `action_${i + 1}`,
      label: action.label.trim(),
      icon: action.icon === 'none' ? undefined : action.icon,
      style: action.style,
      requires: action.requires.length
        ? action.requires.flatMap((key) => fieldId.get(key) ?? [])
        : undefined,
      confirm: action.confirm
        ? { title: action.confirmTitle.trim(), message: blankToUndefined(action.confirmMessage) }
        : undefined,
    })),
  }
}

export const toSendBody = (
  data: NotificationFormValues,
  imageFilePath?: `temp/${string}`
): AdminSendNotificationBody => {
  const isPhone = data.audienceMode === 'PHONE_SINGLE' || data.audienceMode === 'PHONE_LIST'
  const link = toLink(data)
  return {
    audience: toAudience(data),
    content: {
      header: data.header.trim(),
      message: data.message.trim(),
      imageFilePath,
      actionButtonText: link ? blankToUndefined(data.actionButtonText) : undefined,
    },
    link,
    smsFallbackText:
      isPhone && data.smsEnabled ? blankToUndefined(data.smsFallbackText) : undefined,
    interaction: toInteraction(data),
  }
}

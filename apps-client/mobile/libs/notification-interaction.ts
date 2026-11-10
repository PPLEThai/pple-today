import 'dayjs/locale/th'

import dayjs from 'dayjs'

import type { NotificationInteraction } from '@api/backoffice/app'

/**
 * Pure logic behind the in-app interactive-notification form
 * (docs/interactive-notifications.md, "Mobile client — in-app form").
 *
 * Everything here mirrors rules the server enforces on submit. The server is the
 * authority; these only decide what the form lets the user press and what it
 * says, so the two should stay in step with `validateAnswer` in the API.
 */

export type InteractionField = NotificationInteraction['fields'][number]
export type InteractionAction = NotificationInteraction['actions'][number]
export type CheckboxField = Extract<InteractionField, { type: 'checkbox' }>
export type InteractionValues = Record<string, string | string[]>

/** The only `v` this build knows how to render. */
export const SUPPORTED_INTERACTION_VERSION = 1

/** Raw form state: text/radio hold a string, checkbox a list of option ids. */
export type FormValues = Record<string, string | string[] | undefined>

/**
 * The icon allowlist. Mirrors NOTIFICATION_INTERACTION_ICONS in api-common and
 * the iOS extension's SF Symbol map; the component maps each to a lucide icon.
 */
export const ICON_NAMES = [
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
] as const
export type InteractionIconName = (typeof ICON_NAMES)[number]

/** An icon name from the sender, or null when this build does not know it. */
export function resolveIconName(name: unknown): InteractionIconName | null {
  return typeof name === 'string' && (ICON_NAMES as readonly string[]).includes(name)
    ? (name as InteractionIconName)
    : null
}

export type ActionStyle = 'primary' | 'outline' | 'destructive'

/** `primary` for the first action and `outline` for the rest, unless stated. */
export function resolveActionStyle(action: { style?: string }, index: number): ActionStyle {
  if (action.style === 'primary' || action.style === 'outline' || action.style === 'destructive') {
    return action.style
  }
  return index === 0 ? 'primary' : 'outline'
}

/** Starting form state: radio `default` and checkbox `default`. */
export function initialValues(fields: InteractionField[]): FormValues {
  const values: FormValues = {}
  for (const field of fields) {
    if (field.type === 'radio') {
      if (field.default !== undefined && field.options.some((o) => o.id === field.default)) {
        values[field.id] = field.default
      }
    } else if (field.type === 'checkbox' && field.default) {
      const known = field.default.filter((id) => field.options.some((o) => o.id === id))
      if (known.length > 0) values[field.id] = known
    }
  }
  return values
}

/** Whether `field` must have a value for `action`: `required`, or listed in `requires`. */
export function isFieldRequiredFor(field: InteractionField, action: InteractionAction): boolean {
  return field.required || (action.requires?.includes(field.id) ?? false)
}

/** A user-readable reason the field's current value is not acceptable, or null. */
export function validateField(
  field: InteractionField,
  value: string | string[] | undefined,
  required: boolean
): string | null {
  if (field.type === 'text') {
    const text = typeof value === 'string' ? value.trim() : ''
    if (text === '') return required ? 'กรุณากรอกข้อมูล' : null
    if (text.length > field.maxLength) return `กรอกได้ไม่เกิน ${field.maxLength} ตัวอักษร`
    if (field.minLength !== undefined && text.length < field.minLength) {
      return `กรอกอย่างน้อย ${field.minLength} ตัวอักษร`
    }
    return null
  }
  if (field.type === 'radio') {
    if (typeof value !== 'string' || value === '')
      return required ? 'กรุณาเลือกหนึ่งตัวเลือก' : null
    return field.options.some((o) => o.id === value) ? null : 'กรุณาเลือกหนึ่งตัวเลือก'
  }
  const picked = Array.isArray(value) ? value : []
  if (picked.length === 0) return required ? 'กรุณาเลือกอย่างน้อยหนึ่งตัวเลือก' : null
  if (field.min !== undefined && picked.length < field.min) {
    return `เลือกอย่างน้อย ${field.min} ตัวเลือก`
  }
  if (field.max !== undefined && picked.length > field.max) {
    return `เลือกได้ไม่เกิน ${field.max} ตัวเลือก`
  }
  return null
}

/** Field id to error message for every field that blocks `action`. Empty when it may be sent. */
export function actionErrors(
  fields: InteractionField[],
  action: InteractionAction,
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const error = validateField(field, values[field.id], isFieldRequiredFor(field, action))
    if (error) errors[field.id] = error
  }
  return errors
}

export function isActionValid(
  fields: InteractionField[],
  action: InteractionAction,
  values: FormValues
): boolean {
  return Object.keys(actionErrors(fields, action, values)).length === 0
}

/**
 * The `values` to POST: text trimmed and omitted when empty, checkbox ids in
 * option order and omitted when none, radio as the option id. Returns undefined
 * when there is nothing to send.
 */
export function normaliseValues(
  fields: InteractionField[],
  values: FormValues
): InteractionValues | undefined {
  const out: InteractionValues = {}
  for (const field of fields) {
    const value = values[field.id]
    if (field.type === 'text') {
      const text = typeof value === 'string' ? value.trim() : ''
      if (text !== '') out[field.id] = text
    } else if (field.type === 'radio') {
      if (typeof value === 'string' && field.options.some((o) => o.id === value)) {
        out[field.id] = value
      }
    } else {
      const picked = Array.isArray(value) ? value : []
      const ordered = field.options.map((o) => o.id).filter((id) => picked.includes(id))
      if (ordered.length > 0) out[field.id] = ordered
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Toggle an option in a checkbox selection. Selecting past `max` is ignored so
 * the form never builds a value the server would refuse.
 */
export function toggleOption(field: CheckboxField, current: string[], optionId: string): string[] {
  if (current.includes(optionId)) return current.filter((id) => id !== optionId)
  if (field.max !== undefined && current.length >= field.max) return current
  return [...current, optionId]
}

/** "10 พ.ย. 14:03" */
export function formatRespondedAt(date: dayjs.ConfigType): string {
  return dayjs(date).locale('th').format('D MMM HH:mm')
}

export type SummaryLine = { label: string; value: string }

export type ResponseSummary = {
  /** "คุณตอบกลับแล้ว: ✓ อนุมัติ · 10 พ.ย. 14:03" */
  headline: string
  /** The values the user gave, in field order, as readable text. */
  lines: SummaryLine[]
}

/**
 * The read-only summary shown once answered. `values` are absent once purged, and
 * an option the spec no longer lists is skipped rather than shown as a raw id.
 */
export function summariseResponse(
  interaction: Pick<NotificationInteraction, 'fields' | 'actions' | 'response'>
): ResponseSummary | null {
  const response = interaction.response
  if (!response) return null
  const action = interaction.actions.find((a) => a.id === response.actionId)
  const label = action?.label ?? response.actionId
  const lines: SummaryLine[] = []
  for (const field of interaction.fields) {
    const value = response.values?.[field.id]
    if (value === undefined) continue
    if (field.type === 'text') {
      if (typeof value === 'string' && value !== '') lines.push({ label: field.label, value })
      continue
    }
    const ids = Array.isArray(value) ? value : [value]
    const labels = ids
      .map((id) => field.options.find((o) => o.id === id)?.label)
      .filter((l): l is string => !!l)
    if (labels.length > 0) lines.push({ label: field.label, value: labels.join(', ') })
  }
  return {
    headline: `คุณตอบกลับแล้ว: ✓ ${label} · ${formatRespondedAt(response.respondedAt)}`,
    lines,
  }
}

export const MESSAGE_EXPIRED = 'หมดเวลาตอบกลับ'
export const MESSAGE_CLOSED = 'ปิดรับคำตอบแล้ว'
export const MESSAGE_UPDATE_APP = 'อัปเดตแอปเพื่อตอบกลับ'

/**
 * What to show in place of the form, or null when the form (or the summary, for
 * RESPONDED) should render. An unknown `v` wins over everything: the shape of
 * the rest cannot be trusted.
 */
export function interactionBlockedMessage(interaction: {
  v: number
  state: string
}): string | null {
  if (interaction.v !== SUPPORTED_INTERACTION_VERSION) return MESSAGE_UPDATE_APP
  if (interaction.state === 'EXPIRED') return MESSAGE_EXPIRED
  if (interaction.state === 'CLOSED') return MESSAGE_CLOSED
  return null
}

/** Error code inside a rejected API call (`error.value.error.code`), if any. */
export function responseErrorCode(error: unknown): string | null {
  const code = (error as { value?: { error?: { code?: unknown } } } | null)?.value?.error?.code
  return typeof code === 'string' ? code : null
}

/** The existing answer carried by a 409 NOTIFICATION_ALREADY_RESPONDED body. */
export function interactionFromConflict(error: unknown): NotificationInteraction | null {
  if (responseErrorCode(error) !== 'NOTIFICATION_ALREADY_RESPONDED') return null
  const interaction = (error as { value: { error: { data?: { interaction?: unknown } } } }).value
    .error.data?.interaction
  return interaction && typeof interaction === 'object'
    ? (interaction as NotificationInteraction)
    : null
}

/** Which of the two 410 messages applies; the 410 body does not say, so lean on the cached state. */
export function messageForClosed(state: string | undefined): string {
  return state === 'EXPIRED' ? MESSAGE_EXPIRED : MESSAGE_CLOSED
}

/** Labels past this many characters are assumed not to share a row (about half a phone width). */
const MAX_ROW_LABEL_LENGTH = 12
const MAX_ROW_TOTAL_LABEL_LENGTH = 22

/**
 * Whether the action buttons stack vertically: always for three, and for two
 * whose labels are unlikely to fit side by side. A heuristic on label length,
 * because measuring would mean rendering the row twice.
 */
export function shouldStackActions(actions: { label: string }[]): boolean {
  if (actions.length >= 3) return true
  if (actions.length <= 1) return false
  const total = actions.reduce((sum, a) => sum + a.label.length, 0)
  return (
    total > MAX_ROW_TOTAL_LABEL_LENGTH || actions.some((a) => a.label.length > MAX_ROW_LABEL_LENGTH)
  )
}

/** Thai message for a failed submit that is not a 409/410. */
export function responseErrorMessage(error: unknown): string {
  return responseErrorCode(error) === 'NOTIFICATION_RESPONSE_INVALID'
    ? 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    : 'ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

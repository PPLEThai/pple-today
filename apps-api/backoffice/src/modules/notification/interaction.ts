import {
  NOTIFICATION_INTERACTION_ICONS,
  NotificationInteraction,
  NotificationInteractionAction,
  NotificationInteractionField,
  NotificationInteractionIcon,
  NotificationInteractionState,
  NotificationInteractionValues,
  TrayInteraction,
} from '@pple-today/api-common/dtos'

/**
 * Pure logic for interactive notifications (no DB, no I/O). See
 * docs/interactive-notifications.md.
 */

const MAX_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
/** iOS ends an activity after 8 h, so a Live Activity question must fit inside that. */
const MAX_LIVE_ACTIVITY_MS = 8 * 60 * 60 * 1000
const ID_PATTERN = /^[a-z0-9_-]{1,32}$/
/** Ids that would collide with Object.prototype members if ever used as keys. */
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype'])
/** An ISO date-time that states its offset: `Z` or `±hh:mm`. A bare local time is ambiguous. */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

/** The spec as stored on `Notification.interaction`, after validation. */
export type StoredInteraction = {
  v: 1
  ref?: string
  /** ISO date-time. Also lifted into `Notification.interactionExpiresAt`. */
  expiresAt?: string
  fields: NotificationInteractionField[]
  actions: NotificationInteractionAction[]
  tray: boolean
  /** Deliver as an iOS Live Activity where the device supports it. Absent = false. */
  liveActivity?: boolean
}

export type ValidateInteractionSpecResult =
  | { ok: true; spec: StoredInteraction; expiresAt: Date | null }
  | { ok: false; path: string; message: string }

type Fail = { ok: false; path: string; message: string }
const fail = (path: string, message: string): Fail => ({ ok: false, path, message })

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/** `Error` thrown internally to unwind to the first failing path. */
class SpecError extends Error {
  constructor(
    readonly path: string,
    message: string
  ) {
    super(message)
  }
}
const bail = (path: string, message: string): never => {
  throw new SpecError(path, message)
}

function str(v: unknown, path: string, min: number, max: number): string {
  if (typeof v !== 'string') return bail(path, 'must be a string')
  if (v.length < min || v.length > max) {
    return bail(
      path,
      min === 0 ? `must be at most ${max} characters` : `must be ${min}–${max} characters`
    )
  }
  return v
}

function optStr(v: unknown, path: string, min: number, max: number): string | undefined {
  return v === undefined ? undefined : str(v, path, min, max)
}

function optBool(v: unknown, path: string): boolean | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'boolean') return bail(path, 'must be a boolean')
  return v
}

function id(v: unknown, path: string, seen: Set<string>): string {
  if (typeof v !== 'string' || !ID_PATTERN.test(v)) {
    return bail(path, 'must match ^[a-z0-9_-]{1,32}$')
  }
  if (RESERVED_IDS.has(v)) return bail(path, `"${v}" is a reserved id`)
  if (seen.has(v)) return bail(path, `duplicate id "${v}"`)
  seen.add(v)
  return v
}

function arr(v: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(v)) return bail(path, 'must be an array')
  if (v.length < min || v.length > max) return bail(path, `must have ${min}–${max} items`)
  return v
}

function options(v: unknown, path: string, min: number, max: number) {
  const seen = new Set<string>()
  return arr(v, path, min, max).map((raw, i) => {
    const p = `${path}[${i}]`
    if (!isRecord(raw)) return bail(p, 'must be an object')
    return {
      id: id(raw.id, `${p}.id`, seen),
      label: str(raw.label, `${p}.label`, 1, 60),
    }
  })
}

function compact<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

function parseField(raw: unknown, path: string, seen: Set<string>): NotificationInteractionField {
  if (!isRecord(raw)) return bail(path, 'must be an object')
  const fieldId = id(raw.id, `${path}.id`, seen)
  const base = {
    id: fieldId,
    label: str(raw.label, `${path}.label`, 1, 80),
    description: optStr(raw.description, `${path}.description`, 0, 200),
    required: optBool(raw.required, `${path}.required`) ?? false,
  }

  switch (raw.type) {
    case 'text': {
      const maxLength = raw.maxLength === undefined ? 500 : raw.maxLength
      if (!isInt(maxLength) || maxLength < 1 || maxLength > 1000) {
        return bail(`${path}.maxLength`, 'must be an integer 1–1000')
      }
      const minLength = raw.minLength
      if (
        minLength !== undefined &&
        (!isInt(minLength) || minLength < 1 || minLength > maxLength)
      ) {
        return bail(`${path}.minLength`, 'must be an integer from 1 up to maxLength')
      }
      return compact({
        ...base,
        type: 'text' as const,
        placeholder: optStr(raw.placeholder, `${path}.placeholder`, 0, 80),
        multiline: optBool(raw.multiline, `${path}.multiline`) ?? false,
        maxLength,
        minLength: minLength as number | undefined,
      })
    }
    case 'radio': {
      const opts = options(raw.options, `${path}.options`, 2, 10)
      const def = raw.default
      if (def !== undefined && (typeof def !== 'string' || !opts.some((o) => o.id === def))) {
        return bail(`${path}.default`, 'must be one of the option ids')
      }
      return compact({
        ...base,
        type: 'radio' as const,
        options: opts,
        default: def as string | undefined,
      })
    }
    case 'checkbox': {
      const opts = options(raw.options, `${path}.options`, 1, 10)
      const { min, max } = raw
      if (min !== undefined && (!isInt(min) || min < 0 || min > opts.length)) {
        return bail(`${path}.min`, `must be an integer 0–${opts.length}`)
      }
      if (max !== undefined && (!isInt(max) || max < 1 || max > opts.length)) {
        return bail(`${path}.max`, `must be an integer 1–${opts.length}`)
      }
      if (min !== undefined && max !== undefined && min > max) {
        return bail(`${path}.min`, 'must not exceed max')
      }
      let def: string[] | undefined
      if (raw.default !== undefined) {
        const ids = new Set(opts.map((o) => o.id))
        const seenDefault = new Set<string>()
        def = arr(raw.default, `${path}.default`, 0, opts.length).map((d, i) => {
          if (typeof d !== 'string' || !ids.has(d)) {
            return bail(`${path}.default[${i}]`, 'must be one of the option ids')
          }
          if (seenDefault.has(d)) return bail(`${path}.default[${i}]`, `duplicate id "${d}"`)
          seenDefault.add(d)
          return d
        })
        if (max !== undefined && def.length > max) {
          return bail(`${path}.default`, 'must not have more items than max')
        }
      }
      return compact({
        ...base,
        type: 'checkbox' as const,
        options: opts,
        min: min as number | undefined,
        max: max as number | undefined,
        default: def,
      })
    }
    default:
      return bail(`${path}.type`, 'must be one of text, radio, checkbox')
  }
}

function parseAction(
  raw: unknown,
  path: string,
  index: number,
  seen: Set<string>,
  fieldIds: Set<string>
): NotificationInteractionAction {
  if (!isRecord(raw)) return bail(path, 'must be an object')
  const actionId = id(raw.id, `${path}.id`, seen)
  const label = str(raw.label, `${path}.label`, 1, 24)

  let icon: NotificationInteractionIcon | undefined
  if (raw.icon !== undefined) {
    if (
      typeof raw.icon !== 'string' ||
      !(NOTIFICATION_INTERACTION_ICONS as readonly string[]).includes(raw.icon)
    ) {
      return bail(`${path}.icon`, `must be one of ${NOTIFICATION_INTERACTION_ICONS.join(', ')}`)
    }
    icon = raw.icon as NotificationInteractionIcon
  }

  let style: NotificationInteractionAction['style'] = index === 0 ? 'primary' : 'outline'
  if (raw.style !== undefined) {
    if (raw.style !== 'primary' && raw.style !== 'outline' && raw.style !== 'destructive') {
      return bail(`${path}.style`, 'must be one of primary, outline, destructive')
    }
    style = raw.style
  }

  let requires: string[] | undefined
  if (raw.requires !== undefined) {
    const seenReq = new Set<string>()
    requires = arr(raw.requires, `${path}.requires`, 0, Number.MAX_SAFE_INTEGER).map((r, i) => {
      const p = `${path}.requires[${i}]`
      if (typeof r !== 'string' || !fieldIds.has(r)) return bail(p, 'must name a field in fields')
      if (seenReq.has(r)) return bail(p, `duplicate id "${r}"`)
      seenReq.add(r)
      return r
    })
  }

  let confirm: NotificationInteractionAction['confirm']
  if (raw.confirm !== undefined) {
    if (!isRecord(raw.confirm)) return bail(`${path}.confirm`, 'must be an object')
    confirm = compact({
      title: str(raw.confirm.title, `${path}.confirm.title`, 1, 60),
      message: optStr(raw.confirm.message, `${path}.confirm.message`, 0, 200),
    })
  }

  return compact({ id: actionId, label, icon, style, requires, confirm })
}

/**
 * Validates a sender-supplied `interaction` and returns the stored form (style
 * defaults filled, `v: 1`). The first failing rule wins, named by its path, e.g.
 * `interaction.actions[1].requires[0]`.
 */
export function validateInteractionSpec(input: unknown, now: Date): ValidateInteractionSpecResult {
  try {
    if (!isRecord(input)) return bail('interaction', 'must be an object')

    const ref = optStr(input.ref, 'interaction.ref', 1, 200)

    let expiresAt: Date | null = null
    if (input.expiresAt !== undefined) {
      if (typeof input.expiresAt !== 'string' || !ISO_WITH_OFFSET.test(input.expiresAt)) {
        return bail('interaction.expiresAt', 'must be an ISO date-time with a Z or ±hh:mm offset')
      }
      expiresAt = new Date(input.expiresAt)
      if (Number.isNaN(expiresAt.getTime())) {
        return bail('interaction.expiresAt', 'must be an ISO date-time')
      }
      if (expiresAt.getTime() <= now.getTime()) {
        return bail('interaction.expiresAt', 'must be in the future')
      }
      if (expiresAt.getTime() > now.getTime() + MAX_EXPIRY_MS) {
        return bail('interaction.expiresAt', 'must be at most 30 days ahead')
      }
    }

    const fieldIds = new Set<string>()
    const fields = (
      input.fields === undefined ? [] : arr(input.fields, 'interaction.fields', 0, 5)
    ).map((f, i) => parseField(f, `interaction.fields[${i}]`, fieldIds))

    const actionIds = new Set<string>()
    const actions = arr(input.actions, 'interaction.actions', 1, 3).map((a, i) =>
      parseAction(a, `interaction.actions[${i}]`, i, actionIds, fieldIds)
    )

    const tray = optBool(input.tray, 'interaction.tray') ?? true

    const liveActivity = optBool(input.liveActivity, 'interaction.liveActivity') ?? false

    const spec: StoredInteraction = compact({
      v: 1 as const,
      ref,
      expiresAt: expiresAt?.toISOString(),
      fields,
      actions,
      tray,
      liveActivity: liveActivity ? true : undefined,
    })

    if (liveActivity) {
      if (!expiresAt) {
        return bail('interaction.expiresAt', 'is required when liveActivity is true')
      }
      if (expiresAt.getTime() > now.getTime() + MAX_LIVE_ACTIVITY_MS) {
        return bail(
          'interaction.expiresAt',
          'must be at most 8 hours ahead when liveActivity is true'
        )
      }
      if (!tray) return bail('interaction.tray', 'must not be false when liveActivity is true')
      if (trayShape(spec)?.kind !== 'buttons') {
        return bail(
          'interaction.liveActivity',
          'needs an interaction whose actions are buttons (no reply or form-only shape)'
        )
      }
    }
    return { ok: true, spec, expiresAt }
  } catch (e) {
    if (e instanceof SpecError) return fail(e.path, e.message)
    throw e
  }
}

export type ValidateAnswerResult =
  | { ok: true; actionId: string; values: NotificationInteractionValues | undefined }
  | { ok: false; path: string; message: string }

/**
 * Checks an answer against the stored spec and normalises it: text is trimmed
 * and omitted when empty, checkbox values come back in option order. `values` is
 * undefined when nothing was answered. Paths read `actionId` or `values.<fieldId>`.
 */
export function validateAnswer(
  spec: StoredInteraction,
  body: { actionId: unknown; values?: unknown }
): ValidateAnswerResult {
  const action = spec.actions.find((a) => a.id === body.actionId)
  if (!action) return fail('actionId', 'is not one of the actions')

  let raw: Record<string, unknown> = {}
  if (body.values !== undefined && body.values !== null) {
    if (!isRecord(body.values)) return fail('values', 'must be an object')
    raw = body.values
  }

  for (const key of Object.keys(raw)) {
    if (!spec.fields.some((f) => f.id === key)) return fail(`values.${key}`, 'is not a field')
  }

  // A Map, so a field id can never reach Object.prototype.
  const values = new Map<string, string | string[]>()
  for (const field of spec.fields) {
    const path = `values.${field.id}`
    const required = field.required || (action.requires?.includes(field.id) ?? false)
    const value = Object.prototype.hasOwnProperty.call(raw, field.id) ? raw[field.id] : undefined
    const missing = () => fail(path, 'is required')

    if (field.type === 'text') {
      if (value === undefined || value === null) {
        if (required) return missing()
        continue
      }
      if (typeof value !== 'string') return fail(path, 'must be a string')
      const text = value.trim()
      if (text === '') {
        if (required) return missing()
        continue
      }
      if (text.length > field.maxLength) {
        return fail(path, `must be at most ${field.maxLength} characters`)
      }
      if (field.minLength !== undefined && text.length < field.minLength) {
        return fail(path, `must be at least ${field.minLength} characters`)
      }
      values.set(field.id, text)
    } else if (field.type === 'radio') {
      if (value === undefined || value === null) {
        if (required) return missing()
        continue
      }
      if (typeof value !== 'string' || !field.options.some((o) => o.id === value)) {
        return fail(path, 'must be one of the option ids')
      }
      values.set(field.id, value)
    } else {
      if (value === undefined || value === null) {
        if (required) return missing()
        continue
      }
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        return fail(path, 'must be an array of option ids')
      }
      const picked = new Set<string>()
      for (const v of value as string[]) {
        if (!field.options.some((o) => o.id === v)) return fail(path, 'must be option ids only')
        if (picked.has(v)) return fail(path, 'must not repeat an option')
        picked.add(v)
      }
      if (picked.size === 0) {
        if (required) return missing()
        continue
      }
      if (field.min !== undefined && picked.size < field.min) {
        return fail(path, `must pick at least ${field.min}`)
      }
      if (field.max !== undefined && picked.size > field.max) {
        return fail(path, `must pick at most ${field.max}`)
      }
      values.set(
        field.id,
        field.options.map((o) => o.id).filter((oid) => picked.has(oid))
      )
    }
  }

  return {
    ok: true,
    actionId: action.id,
    values:
      values.size > 0 ? (Object.fromEntries(values) as NotificationInteractionValues) : undefined,
  }
}

/**
 * RESPONDED > CLOSED > EXPIRED > OPEN. A sending app that is gone (retired, or
 * deleted so the notification has no app any more) counts as closed.
 */
export function deriveInteractionState(input: {
  hasResponse: boolean
  closedAt: Date | null
  expiresAt: Date | null
  appGone: boolean
  now: Date
}): NotificationInteractionState {
  if (input.hasResponse) return 'RESPONDED'
  if (input.closedAt || input.appGone) return 'CLOSED'
  if (input.expiresAt && input.expiresAt.getTime() <= input.now.getTime()) return 'EXPIRED'
  return 'OPEN'
}

/** The client-facing interaction: the stored spec minus `ref`, plus state and the caller's answer. */
export function toClientInteraction(
  stored: StoredInteraction,
  state: NotificationInteractionState,
  response?: { actionId: string; values?: NotificationInteractionValues | null; respondedAt: Date }
): NotificationInteraction {
  return compact({
    v: stored.v,
    fields: stored.fields,
    actions: stored.actions,
    state,
    expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : undefined,
    response: response
      ? compact({
          actionId: response.actionId,
          values: response.values ?? undefined,
          respondedAt: response.respondedAt,
        })
      : undefined,
  })
}

type DistributiveOmitId<T> = T extends unknown ? Omit<T, 'id'> : never
export type TrayInteractionShape = DistributiveOmitId<TrayInteraction>

/**
 * What the OS notification shows, decided by the interaction's shape (see
 * "Which interactions get tray actions"). Returns null when the tray gets no
 * buttons and a tap opens the form. The caller adds the notification `id`.
 */
export function trayShape(spec: StoredInteraction): TrayInteractionShape | null {
  if (!spec.tray) return null

  const { fields, actions } = spec
  const toButtons = (): TrayInteractionShape => ({
    kind: 'buttons',
    actions: actions.map((a) =>
      compact({
        id: a.id,
        label: a.label,
        icon: a.icon,
        destructive: a.style === 'destructive' ? true : undefined,
        bg: !a.confirm && !(a.requires && a.requires.length > 0),
      })
    ),
  })

  if (fields.length === 0) return toButtons()

  const field = fields[0]
  if (fields.length === 1 && field.type === 'text' && actions.length === 1) {
    const action = actions[0]
    // A dialog can't be shown in the tray, so a confirming action becomes a
    // plain button that opens the app (bg: false), where the dialog is shown.
    if (action.confirm) {
      return {
        kind: 'buttons',
        actions: [
          compact({
            id: action.id,
            label: action.label,
            icon: action.icon,
            destructive: action.style === 'destructive' ? true : undefined,
            bg: false,
          }),
        ],
      }
    }
    return compact({
      kind: 'reply' as const,
      fieldId: field.id,
      placeholder: field.placeholder,
      submitLabel: action.label,
      actionId: action.id,
      bg: true as const,
    })
  }

  if (fields.every((f) => f.type === 'text' && !f.required)) return toButtons()
  return null
}

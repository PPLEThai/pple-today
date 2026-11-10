import { describe, expect, test } from 'vitest'

import {
  actionErrors,
  type CheckboxField,
  initialValues,
  type InteractionAction,
  interactionBlockedMessage,
  type InteractionField,
  interactionFromConflict,
  isActionValid,
  messageForClosed,
  normaliseValues,
  resolveActionStyle,
  resolveIconName,
  shouldStackActions,
  summariseResponse,
  toggleOption,
} from './notification-interaction'

const note: InteractionField = {
  id: 'note',
  type: 'text',
  label: 'เหตุผล',
  required: false,
  multiline: true,
  maxLength: 10,
  minLength: 3,
}
const pick: InteractionField = {
  id: 'pick',
  type: 'radio',
  label: 'เลือก',
  required: true,
  options: [
    { id: 'a', label: 'ก' },
    { id: 'b', label: 'ข' },
  ],
  default: 'b',
}
const tags: CheckboxField = {
  id: 'tags',
  type: 'checkbox',
  label: 'แท็ก',
  required: false,
  options: [
    { id: 'x', label: 'เอ็กซ์' },
    { id: 'y', label: 'วาย' },
    { id: 'z', label: 'แซด' },
  ],
  min: 1,
  max: 2,
  default: ['y', 'nope'],
}
const action = (over: Partial<InteractionAction> = {}): InteractionAction => ({
  id: 'go',
  label: 'ไป',
  style: 'primary',
  ...over,
})

describe('initialValues', () => {
  test('seeds radio and checkbox defaults, dropping unknown option ids', () => {
    expect(initialValues([note, pick, tags])).toEqual({ pick: 'b', tags: ['y'] })
  })
})

describe('action validity', () => {
  test('a field needs a value only for actions that require it', () => {
    const approve = action()
    const reject = action({ id: 'reject', requires: ['note'] })
    expect(isActionValid([note], approve, {})).toBe(true)
    expect(isActionValid([note], reject, {})).toBe(false)
    expect(isActionValid([note], reject, { note: '   ' })).toBe(false)
    expect(isActionValid([note], reject, { note: ' okay ' })).toBe(true)
  })

  test('a required field blocks every action', () => {
    expect(isActionValid([pick], action(), {})).toBe(false)
    expect(isActionValid([pick], action(), { pick: 'a' })).toBe(true)
  })

  test('text length is checked after trimming, and applies to optional fields once filled', () => {
    expect(actionErrors([note], action(), { note: ' ab ' }).note).toBeDefined()
    expect(actionErrors([note], action(), { note: 'a'.repeat(11) }).note).toBeDefined()
    expect(actionErrors([note], action(), { note: 'abc' })).toEqual({})
    expect(actionErrors([note], action(), {})).toEqual({})
  })

  test('checkbox min and max apply once something is picked', () => {
    expect(actionErrors([tags], action(), {})).toEqual({})
    expect(actionErrors([tags], action(), { tags: ['x', 'y', 'z'] }).tags).toBeDefined()
    expect(actionErrors([tags], action(), { tags: ['x'] })).toEqual({})
    expect(actionErrors([{ ...tags, required: true }], action(), { tags: [] }).tags).toBeDefined()
  })

  test('radio value must be an option id', () => {
    expect(actionErrors([pick], action(), { pick: 'zzz' }).pick).toBeDefined()
  })
})

describe('normaliseValues', () => {
  test('trims text, omits empties, orders checkbox ids by option order', () => {
    expect(
      normaliseValues([note, pick, tags], { note: '  hello ', pick: 'a', tags: ['z', 'x'] })
    ).toEqual({ note: 'hello', pick: 'a', tags: ['x', 'z'] })
    expect(normaliseValues([note, tags], { note: '   ', tags: [] })).toBeUndefined()
  })
})

describe('toggleOption', () => {
  test('adds, removes, and refuses to exceed max', () => {
    expect(toggleOption(tags, [], 'x')).toEqual(['x'])
    expect(toggleOption(tags, ['x'], 'x')).toEqual([])
    expect(toggleOption(tags, ['x', 'y'], 'z')).toEqual(['x', 'y'])
  })
})

describe('icons and styles', () => {
  test('known icons resolve and unknown ones do not', () => {
    expect(resolveIconName('calendar-check')).toBe('calendar-check')
    expect(resolveIconName('help')).toBe('help')
    expect(resolveIconName('rocket')).toBeNull()
    expect(resolveIconName(undefined)).toBeNull()
  })

  test('style defaults to primary for the first action and outline for the rest', () => {
    expect(resolveActionStyle({}, 0)).toBe('primary')
    expect(resolveActionStyle({}, 2)).toBe('outline')
    expect(resolveActionStyle({ style: 'destructive' }, 0)).toBe('destructive')
    expect(resolveActionStyle({ style: 'weird' }, 1)).toBe('outline')
  })
})

describe('shouldStackActions', () => {
  test('three stack, short pairs share a row, long labels stack', () => {
    const l = (label: string) => ({ label })
    expect(shouldStackActions([l('ก'), l('ข'), l('ค')])).toBe(true)
    expect(shouldStackActions([l('อนุมัติ'), l('ไม่อนุมัติ')])).toBe(false)
    expect(shouldStackActions([l('ยืนยันการเข้าร่วมงานวันนี้'), l('ไม่')])).toBe(true)
    expect(shouldStackActions([l('ตกลง')])).toBe(false)
  })
})

describe('summariseResponse', () => {
  const base = {
    fields: [note, pick, tags],
    actions: [action({ id: 'approve', label: 'อนุมัติ' })],
  }

  test('headline names the action and the time, and values read as labels', () => {
    const summary = summariseResponse({
      ...base,
      response: {
        actionId: 'approve',
        values: { note: 'โอเค', pick: 'a', tags: ['x', 'z'] },
        respondedAt: new Date(2026, 10, 10, 14, 3),
      },
    })
    expect(summary?.headline).toBe('คุณตอบกลับแล้ว: ✓ อนุมัติ · 10 พ.ย. 14:03')
    expect(summary?.lines).toEqual([
      { label: 'เหตุผล', value: 'โอเค' },
      { label: 'เลือก', value: 'ก' },
      { label: 'แท็ก', value: 'เอ็กซ์, แซด' },
    ])
  })

  test('purged values give a headline only; no response gives null', () => {
    const response = { actionId: 'approve', respondedAt: new Date(2026, 10, 10, 9, 5) }
    expect(summariseResponse({ ...base, response })?.lines).toEqual([])
    expect(summariseResponse({ ...base })).toBeNull()
  })
})

describe('blocked states', () => {
  test('unknown version wins, then expired and closed', () => {
    expect(interactionBlockedMessage({ v: 2, state: 'EXPIRED' })).toBe('อัปเดตแอปเพื่อตอบกลับ')
    expect(interactionBlockedMessage({ v: 1, state: 'EXPIRED' })).toBe('หมดเวลาตอบกลับ')
    expect(interactionBlockedMessage({ v: 1, state: 'CLOSED' })).toBe('ปิดรับคำตอบแล้ว')
    expect(interactionBlockedMessage({ v: 1, state: 'OPEN' })).toBeNull()
    expect(interactionBlockedMessage({ v: 1, state: 'RESPONDED' })).toBeNull()
  })

  test('a 410 reads as expired only when the cached state says so', () => {
    expect(messageForClosed('EXPIRED')).toBe('หมดเวลาตอบกลับ')
    expect(messageForClosed('OPEN')).toBe('ปิดรับคำตอบแล้ว')
    expect(messageForClosed(undefined)).toBe('ปิดรับคำตอบแล้ว')
  })
})

describe('interactionFromConflict', () => {
  test('pulls the interaction out of a 409 body and ignores other errors', () => {
    const interaction = { v: 1, state: 'RESPONDED' }
    const conflict = {
      value: { error: { code: 'NOTIFICATION_ALREADY_RESPONDED', data: { interaction } } },
    }
    expect(interactionFromConflict(conflict)).toBe(interaction)
    expect(interactionFromConflict({ value: { error: { code: 'OTHER' } } })).toBeNull()
    expect(interactionFromConflict(new Error('offline'))).toBeNull()
  })
})

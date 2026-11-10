import { describe, expect, test } from 'vitest'

import {
  deriveInteractionState,
  StoredInteraction,
  toClientInteraction,
  trayShape,
  validateAnswer,
  validateInteractionSpec,
} from './interaction'

const NOW = new Date('2026-11-10T00:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const approveReject = {
  actions: [
    { id: 'approve', label: 'อนุมัติ', icon: 'check' },
    { id: 'reject', label: 'ไม่อนุมัติ', icon: 'x', style: 'destructive' },
  ],
}

function valid(input: unknown): StoredInteraction {
  const r = validateInteractionSpec(input, NOW)
  if (!r.ok) throw new Error(`${r.path}: ${r.message}`)
  return r.spec
}

function invalid(input: unknown) {
  const r = validateInteractionSpec(input, NOW)
  if (r.ok) throw new Error('expected failure')
  return r
}

describe('validateInteractionSpec', () => {
  test('accepts the spec example and fills defaults', () => {
    const r = validateInteractionSpec(
      {
        ref: 'leave:123',
        expiresAt: '2026-11-17T00:00:00Z',
        fields: [{ id: 'note', type: 'text', label: 'เหตุผล', multiline: true, maxLength: 300 }],
        actions: [
          { id: 'approve', label: 'อนุมัติ', icon: 'check', style: 'primary' },
          {
            id: 'reject',
            label: 'ไม่อนุมัติ',
            icon: 'x',
            style: 'destructive',
            requires: ['note'],
            confirm: { title: 'ยืนยันการไม่อนุมัติ?' },
          },
        ],
      },
      NOW
    )
    expect(r).toEqual({
      ok: true,
      expiresAt: new Date('2026-11-17T00:00:00Z'),
      spec: {
        v: 1,
        ref: 'leave:123',
        expiresAt: '2026-11-17T00:00:00.000Z',
        tray: true,
        fields: [
          {
            id: 'note',
            type: 'text',
            label: 'เหตุผล',
            required: false,
            multiline: true,
            maxLength: 300,
          },
        ],
        actions: [
          { id: 'approve', label: 'อนุมัติ', icon: 'check', style: 'primary' },
          {
            id: 'reject',
            label: 'ไม่อนุมัติ',
            icon: 'x',
            style: 'destructive',
            requires: ['note'],
            confirm: { title: 'ยืนยันการไม่อนุมัติ?' },
          },
        ],
      },
    })
  })

  test('minimal spec: styles default primary then outline; no keys with undefined values', () => {
    const spec = valid({
      actions: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    })
    expect(spec).toEqual({
      v: 1,
      tray: true,
      fields: [],
      actions: [
        { id: 'a', label: 'A', style: 'primary' },
        { id: 'b', label: 'B', style: 'outline' },
        { id: 'c', label: 'C', style: 'outline' },
      ],
    })
    expect('ref' in spec).toBe(false)
    expect('expiresAt' in spec).toBe(false)
  })

  test('tray:false is preserved', () => {
    expect(valid({ ...approveReject, tray: false }).tray).toBe(false)
  })

  test('text maxLength defaults to 500', () => {
    const spec = valid({ ...approveReject, fields: [{ id: 'n', type: 'text', label: 'N' }] })
    expect(spec.fields[0]).toMatchObject({ maxLength: 500, multiline: false, required: false })
  })

  test('strips unknown properties', () => {
    const spec = valid({ ...approveReject, bogus: 1 })
    expect('bogus' in spec).toBe(false)
  })

  test.each([
    ['non-object', 'x', 'interaction'],
    ['array', [], 'interaction'],
    ['null', null, 'interaction'],
    ['missing actions', {}, 'interaction.actions'],
    ['zero actions', { actions: [] }, 'interaction.actions'],
    [
      'four actions',
      { actions: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })) },
      'interaction.actions',
    ],
    ['ref too long', { ...approveReject, ref: 'x'.repeat(201) }, 'interaction.ref'],
    ['ref empty', { ...approveReject, ref: '' }, 'interaction.ref'],
    ['ref not a string', { ...approveReject, ref: 5 }, 'interaction.ref'],
    ['tray not boolean', { ...approveReject, tray: 'no' }, 'interaction.tray'],
    [
      'six fields',
      {
        ...approveReject,
        fields: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, type: 'text', label: id })),
      },
      'interaction.fields',
    ],
    ['fields not array', { ...approveReject, fields: {} }, 'interaction.fields'],
  ])('rejects %s', (_n, input, path) => {
    expect(invalid(input).path).toBe(path)
  })

  describe('liveActivity', () => {
    const HOUR = 60 * 60 * 1000
    const in3h = new Date(NOW.getTime() + 3 * HOUR).toISOString()
    const live = { ...approveReject, expiresAt: in3h, liveActivity: true }

    test('is stored only when true', () => {
      expect(valid(live).liveActivity).toBe(true)
      expect('liveActivity' in valid({ ...live, liveActivity: false })).toBe(false)
      expect('liveActivity' in valid(approveReject)).toBe(false)
    })

    test('must be a boolean', () => {
      expect(invalid({ ...live, liveActivity: 'yes' })).toMatchObject({
        path: 'interaction.liveActivity',
      })
    })

    test('requires expiresAt', () => {
      const r = invalid({ ...approveReject, liveActivity: true })
      expect(r.path).toBe('interaction.expiresAt')
      expect(r.message).toMatch(/required/)
    })

    test('allows exactly 8 h ahead and refuses more', () => {
      valid({ ...live, expiresAt: new Date(NOW.getTime() + 8 * HOUR).toISOString() })
      const r = invalid({
        ...live,
        expiresAt: new Date(NOW.getTime() + 8 * HOUR + 1000).toISOString(),
      })
      expect(r).toMatchObject({ path: 'interaction.expiresAt' })
      expect(r.message).toMatch(/8 hours/)
    })

    test('refuses tray: false', () => {
      expect(invalid({ ...live, tray: false })).toMatchObject({ path: 'interaction.tray' })
    })

    test('refuses shapes that are not buttons: reply and form-only', () => {
      const reply = {
        fields: [{ id: 'note', type: 'text', label: 'Note' }],
        actions: [{ id: 'send', label: 'Send' }],
        expiresAt: in3h,
        liveActivity: true,
      }
      expect(invalid(reply)).toMatchObject({ path: 'interaction.liveActivity' })
      const form = {
        fields: [{ id: 'note', type: 'text', label: 'Note', required: true }],
        actions: [{ id: 'send', label: 'Send' }],
        expiresAt: in3h,
        liveActivity: true,
      }
      expect(invalid(form)).toMatchObject({ path: 'interaction.liveActivity' })
    })

    test('accepts buttons with optional text fields and confirm actions', () => {
      valid({
        fields: [{ id: 'note', type: 'text', label: 'Note' }],
        actions: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', confirm: { title: 'Sure?' } },
        ],
        expiresAt: in3h,
        liveActivity: true,
      })
    })
  })

  describe('expiresAt', () => {
    test.each([
      ['not a date', 'tomorrow'],
      ['number', 5],
      ['date-only', '2026-11-12'],
      ['impossible date', '2026-13-45T00:00:00Z'],
      ['no offset', '2026-11-12T00:00:00'],
      ['no offset with millis', '2026-11-12T00:00:00.000'],
    ])('rejects %s', (_n, expiresAt) => {
      const r = invalid({ ...approveReject, expiresAt })
      expect(r.path).toBe('interaction.expiresAt')
      expect(r.message).toMatch(/ISO/)
    })

    test('rejects the past and now', () => {
      for (const d of [new Date(NOW.getTime() - 1000), NOW]) {
        const r = invalid({ ...approveReject, expiresAt: d.toISOString() })
        expect(r).toMatchObject({ path: 'interaction.expiresAt', message: 'must be in the future' })
      }
    })

    test.each(['2026-11-12T00:00:00Z', '2026-11-12T07:00:00+07:00', '2026-11-12T07:00:00.5-00:00'])(
      'accepts an explicit offset: %s',
      (expiresAt) => {
        valid({ ...approveReject, expiresAt })
      }
    )

    test('an offset is honoured when comparing', () => {
      // 2026-11-10T06:00+07:00 is 2026-11-09T23:00Z: before NOW.
      expect(invalid({ ...approveReject, expiresAt: '2026-11-10T06:00:00+07:00' }).message).toBe(
        'must be in the future'
      )
    })

    test('allows exactly 30 days, refuses beyond', () => {
      expect(
        valid({ ...approveReject, expiresAt: new Date(NOW.getTime() + 30 * DAY).toISOString() })
      )
      const r = invalid({
        ...approveReject,
        expiresAt: new Date(NOW.getTime() + 30 * DAY + 1000).toISOString(),
      })
      expect(r.message).toMatch(/30 days/)
    })
  })

  describe('ids', () => {
    test.each(['__proto__', 'constructor', 'prototype'])('reserved id %j is rejected', (rid) => {
      expect(invalid({ actions: [{ id: rid, label: 'a' }] }).path).toBe('interaction.actions[0].id')
      expect(
        invalid({
          fields: [{ id: rid, type: 'text', label: 'f' }],
          actions: [{ id: 'a', label: 'a' }],
        }).path
      ).toBe('interaction.fields[0].id')
      const options = [
        { id: rid, label: 'x' },
        { id: 'b', label: 'y' },
      ]
      expect(
        invalid({
          fields: [{ id: 'r', type: 'radio', label: 'f', options }],
          actions: [{ id: 'a', label: 'a' }],
        }).path
      ).toBe('interaction.fields[0].options[0].id')
    })

    test.each(['', 'UPPER', 'has space', 'a'.repeat(33), 'ไทย', 'a.b'])(
      'bad action id %j',
      (id) => {
        expect(invalid({ actions: [{ id, label: 'x' }] }).path).toBe('interaction.actions[0].id')
      }
    )

    test('action ids unique', () => {
      expect(
        invalid({
          actions: [
            { id: 'a', label: 'x' },
            { id: 'a', label: 'y' },
          ],
        })
      ).toMatchObject({ path: 'interaction.actions[1].id' })
    })

    test('field ids unique, option ids unique per field', () => {
      expect(
        invalid({
          ...approveReject,
          fields: [
            { id: 'a', type: 'text', label: 'x' },
            { id: 'a', type: 'text', label: 'y' },
          ],
        }).path
      ).toBe('interaction.fields[1].id')
      expect(
        invalid({
          ...approveReject,
          fields: [
            {
              id: 'r',
              type: 'radio',
              label: 'x',
              options: [
                { id: 'o', label: 'a' },
                { id: 'o', label: 'b' },
              ],
            },
          ],
        }).path
      ).toBe('interaction.fields[0].options[1].id')
    })

    test('a field and an action may share an id', () => {
      valid({
        fields: [{ id: 'x', type: 'text', label: 'x' }],
        actions: [{ id: 'x', label: 'x' }],
      })
    })
  })

  describe('actions', () => {
    test('label length 1–24', () => {
      expect(invalid({ actions: [{ id: 'a', label: '' }] }).path).toBe(
        'interaction.actions[0].label'
      )
      expect(invalid({ actions: [{ id: 'a', label: 'x'.repeat(25) }] }).path).toBe(
        'interaction.actions[0].label'
      )
      valid({ actions: [{ id: 'a', label: 'x'.repeat(24) }] })
    })

    test('icon must be allowlisted', () => {
      const r = invalid({ actions: [{ id: 'a', label: 'x', icon: 'rocket' }] })
      expect(r.path).toBe('interaction.actions[0].icon')
    })

    test('every allowlisted icon passes', () => {
      for (const icon of [
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
      ]) {
        expect(valid({ actions: [{ id: 'a', label: 'x', icon }] }).actions[0].icon).toBe(icon)
      }
    })

    test('style must be known', () => {
      expect(invalid({ actions: [{ id: 'a', label: 'x', style: 'red' }] }).path).toBe(
        'interaction.actions[0].style'
      )
    })

    test('requires must name existing fields', () => {
      const r = invalid({
        fields: [{ id: 'note', type: 'text', label: 'n' }],
        actions: [
          { id: 'a', label: 'a' },
          { id: 'b', label: 'b', requires: ['note', 'nope'] },
        ],
      })
      expect(r.path).toBe('interaction.actions[1].requires[1]')
    })

    test('requires with no fields is refused at [0]', () => {
      expect(invalid({ actions: [{ id: 'a', label: 'a', requires: ['x'] }] }).path).toBe(
        'interaction.actions[0].requires[0]'
      )
    })

    test('requires must not repeat', () => {
      expect(
        invalid({
          fields: [{ id: 'n', type: 'text', label: 'n' }],
          actions: [{ id: 'a', label: 'a', requires: ['n', 'n'] }],
        }).path
      ).toBe('interaction.actions[0].requires[1]')
    })

    test('confirm needs a title, bounded message', () => {
      expect(invalid({ actions: [{ id: 'a', label: 'a', confirm: {} }] }).path).toBe(
        'interaction.actions[0].confirm.title'
      )
      expect(invalid({ actions: [{ id: 'a', label: 'a', confirm: 'yes' }] }).path).toBe(
        'interaction.actions[0].confirm'
      )
      expect(
        invalid({
          actions: [{ id: 'a', label: 'a', confirm: { title: 't', message: 'm'.repeat(201) } }],
        }).path
      ).toBe('interaction.actions[0].confirm.message')
      valid({ actions: [{ id: 'a', label: 'a', confirm: { title: 't', message: 'm' } }] })
    })

    test('reports the first failing path in document order', () => {
      const r = invalid({
        expiresAt: 'bad',
        actions: [{ id: 'BAD', label: '' }],
      })
      expect(r.path).toBe('interaction.expiresAt')
    })
  })

  describe('fields', () => {
    const f = (field: object) => ({ ...approveReject, fields: [field] })

    test('label 1–80, description ≤200', () => {
      expect(invalid(f({ id: 'a', type: 'text', label: '' })).path).toBe(
        'interaction.fields[0].label'
      )
      expect(invalid(f({ id: 'a', type: 'text', label: 'x'.repeat(81) })).path).toBe(
        'interaction.fields[0].label'
      )
      expect(
        invalid(f({ id: 'a', type: 'text', label: 'x', description: 'd'.repeat(201) })).path
      ).toBe('interaction.fields[0].description')
    })

    test('required must be boolean', () => {
      expect(invalid(f({ id: 'a', type: 'text', label: 'x', required: 'yes' })).path).toBe(
        'interaction.fields[0].required'
      )
    })

    test('unknown type', () => {
      expect(invalid(f({ id: 'a', type: 'date', label: 'x' })).path).toBe(
        'interaction.fields[0].type'
      )
    })

    test('text: placeholder ≤80, maxLength 1–1000, minLength ≤ maxLength', () => {
      const t = { id: 'a', type: 'text', label: 'x' }
      expect(invalid(f({ ...t, placeholder: 'p'.repeat(81) })).path).toBe(
        'interaction.fields[0].placeholder'
      )
      for (const maxLength of [0, 1001, 1.5, '5']) {
        expect(invalid(f({ ...t, maxLength })).path).toBe('interaction.fields[0].maxLength')
      }
      valid(f({ ...t, maxLength: 1000 }))
      valid(f({ ...t, maxLength: 1 }))
      expect(invalid(f({ ...t, maxLength: 10, minLength: 11 })).path).toBe(
        'interaction.fields[0].minLength'
      )
      expect(invalid(f({ ...t, minLength: 0 })).path).toBe('interaction.fields[0].minLength')
      expect(invalid(f({ ...t, minLength: 501 })).path).toBe('interaction.fields[0].minLength')
      expect(valid(f({ ...t, minLength: 3 })).fields[0]).toMatchObject({ minLength: 3 })
    })

    const opts = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Option ${i}` }))

    test('radio: 2–10 options, label ≤60, default is an option', () => {
      const r = { id: 'a', type: 'radio', label: 'x' }
      expect(invalid(f({ ...r, options: opts(1) })).path).toBe('interaction.fields[0].options')
      expect(invalid(f({ ...r, options: opts(11) })).path).toBe('interaction.fields[0].options')
      expect(invalid(f({ ...r })).path).toBe('interaction.fields[0].options')
      valid(f({ ...r, options: opts(2) }))
      valid(f({ ...r, options: opts(10) }))
      expect(
        invalid(
          f({
            ...r,
            options: [
              { id: 'a', label: 'x'.repeat(61) },
              { id: 'b', label: 'b' },
            ],
          })
        ).path
      ).toBe('interaction.fields[0].options[0].label')
      expect(invalid(f({ ...r, options: opts(2), default: 'zzz' })).path).toBe(
        'interaction.fields[0].default'
      )
      expect(valid(f({ ...r, options: opts(2), default: 'o1' })).fields[0]).toMatchObject({
        default: 'o1',
      })
    })

    test('checkbox: 1–10 options, min/max sane, defaults valid', () => {
      const c = { id: 'a', type: 'checkbox', label: 'x' }
      expect(invalid(f({ ...c, options: [] })).path).toBe('interaction.fields[0].options')
      expect(invalid(f({ ...c, options: opts(11) })).path).toBe('interaction.fields[0].options')
      valid(f({ ...c, options: opts(1), required: true }))
      expect(invalid(f({ ...c, options: opts(3), min: -1 })).path).toBe('interaction.fields[0].min')
      expect(invalid(f({ ...c, options: opts(3), min: 4 })).path).toBe('interaction.fields[0].min')
      expect(invalid(f({ ...c, options: opts(3), max: 0 })).path).toBe('interaction.fields[0].max')
      expect(invalid(f({ ...c, options: opts(3), max: 4 })).path).toBe('interaction.fields[0].max')
      expect(invalid(f({ ...c, options: opts(3), min: 3, max: 2 })).path).toBe(
        'interaction.fields[0].min'
      )
      valid(f({ ...c, options: opts(3), min: 2, max: 2 }))
      expect(invalid(f({ ...c, options: opts(3), default: ['o0', 'nope'] })).path).toBe(
        'interaction.fields[0].default[1]'
      )
      expect(invalid(f({ ...c, options: opts(3), default: ['o0', 'o0'] })).path).toBe(
        'interaction.fields[0].default[1]'
      )
      expect(invalid(f({ ...c, options: opts(3), max: 1, default: ['o0', 'o1'] })).path).toBe(
        'interaction.fields[0].default'
      )
      expect(invalid(f({ ...c, options: opts(3), default: 'o0' })).path).toBe(
        'interaction.fields[0].default'
      )
    })
  })
})

const form = valid({
  fields: [
    { id: 'note', type: 'text', label: 'Note', maxLength: 10, minLength: 2 },
    {
      id: 'size',
      type: 'radio',
      label: 'Size',
      options: [
        { id: 's', label: 'S' },
        { id: 'l', label: 'L' },
      ],
    },
    {
      id: 'tags',
      type: 'checkbox',
      label: 'Tags',
      min: 1,
      max: 2,
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    },
    {
      id: 'terms',
      type: 'checkbox',
      label: 'Terms',
      required: true,
      options: [{ id: 'ok', label: 'ok' }],
    },
  ],
  actions: [
    { id: 'send', label: 'Send' },
    { id: 'reject', label: 'Reject', requires: ['note', 'size'] },
  ],
})

describe('validateAnswer', () => {
  const answer = (actionId: string, values?: unknown) => validateAnswer(form, { actionId, values })

  test('ok: normalises text (trim), omits empty text, orders checkbox by option order', () => {
    expect(answer('send', { note: '  hi  ', tags: ['c', 'a'], terms: ['ok'] })).toEqual({
      ok: true,
      actionId: 'send',
      values: { note: 'hi', tags: ['a', 'c'], terms: ['ok'] },
    })
    expect(answer('send', { note: '   ', terms: ['ok'] })).toEqual({
      ok: true,
      actionId: 'send',
      values: { terms: ['ok'] },
    })
  })

  test('values undefined when nothing was answered', () => {
    const noFields = valid(approveReject)
    expect(validateAnswer(noFields, { actionId: 'approve' })).toEqual({
      ok: true,
      actionId: 'approve',
      values: undefined,
    })
    expect(validateAnswer(noFields, { actionId: 'approve', values: {} }).ok).toBe(true)
  })

  test('unknown action', () => {
    expect(answer('nope')).toMatchObject({ ok: false, path: 'actionId' })
    expect(validateAnswer(form, { actionId: 5 })).toMatchObject({ ok: false, path: 'actionId' })
  })

  test('unknown field id is refused', () => {
    expect(answer('send', { terms: ['ok'], ghost: 'x' })).toMatchObject({
      ok: false,
      path: 'values.ghost',
    })
  })

  test('values must be an object', () => {
    expect(answer('send', 'x')).toMatchObject({ ok: false, path: 'values' })
    expect(answer('send', ['x'])).toMatchObject({ ok: false, path: 'values' })
  })

  test('required field missing (field.required)', () => {
    expect(answer('send', {})).toMatchObject({
      ok: false,
      path: 'values.terms',
      message: 'is required',
    })
    expect(answer('send', { terms: [] })).toMatchObject({ ok: false, path: 'values.terms' })
  })

  test('action.requires applies only to that action', () => {
    expect(answer('reject', { terms: ['ok'] })).toMatchObject({ ok: false, path: 'values.note' })
    expect(answer('reject', { terms: ['ok'], note: 'no' })).toMatchObject({
      ok: false,
      path: 'values.size',
    })
    expect(answer('reject', { terms: ['ok'], note: 'no', size: 'l' })).toMatchObject({ ok: true })
    expect(answer('send', { terms: ['ok'] })).toMatchObject({ ok: true })
  })

  test('required text that is blank counts as missing', () => {
    expect(answer('reject', { terms: ['ok'], note: '  ', size: 's' })).toMatchObject({
      ok: false,
      path: 'values.note',
    })
  })

  test('text: type, minLength and maxLength are checked after trimming', () => {
    expect(answer('send', { terms: ['ok'], note: 5 })).toMatchObject({
      ok: false,
      path: 'values.note',
    })
    expect(answer('send', { terms: ['ok'], note: ' a ' })).toMatchObject({
      ok: false,
      path: 'values.note',
    })
    expect(answer('send', { terms: ['ok'], note: '12345678901' })).toMatchObject({
      ok: false,
      path: 'values.note',
    })
    expect(answer('send', { terms: ['ok'], note: '  1234567890  ' })).toMatchObject({ ok: true })
  })

  test('radio must be an option id', () => {
    expect(answer('send', { terms: ['ok'], size: 'xl' })).toMatchObject({
      ok: false,
      path: 'values.size',
    })
    expect(answer('send', { terms: ['ok'], size: ['s'] })).toMatchObject({
      ok: false,
      path: 'values.size',
    })
    expect(answer('send', { terms: ['ok'], size: 's' })).toMatchObject({
      ok: true,
      values: { size: 's', terms: ['ok'] },
    })
  })

  test('checkbox: subset, no duplicates, min/max', () => {
    expect(answer('send', { terms: ['ok'], tags: 'a' })).toMatchObject({
      ok: false,
      path: 'values.tags',
    })
    expect(answer('send', { terms: ['ok'], tags: ['a', 1] })).toMatchObject({
      ok: false,
      path: 'values.tags',
    })
    expect(answer('send', { terms: ['ok'], tags: ['z'] })).toMatchObject({
      ok: false,
      path: 'values.tags',
    })
    expect(answer('send', { terms: ['ok'], tags: ['a', 'a'] })).toMatchObject({
      ok: false,
      path: 'values.tags',
    })
    expect(answer('send', { terms: ['ok'], tags: ['a', 'b', 'c'] })).toMatchObject({
      ok: false,
      path: 'values.tags',
      message: 'must pick at most 2',
    })
  })

  test('checkbox min applies once something is picked; unpicked optional is omitted', () => {
    const spec = valid({
      fields: [
        {
          id: 'c',
          type: 'checkbox',
          label: 'c',
          min: 2,
          options: [
            { id: 'a', label: 'a' },
            { id: 'b', label: 'b' },
            { id: 'c', label: 'c' },
          ],
        },
      ],
      actions: [{ id: 'go', label: 'go' }],
    })
    expect(validateAnswer(spec, { actionId: 'go', values: { c: ['a'] } })).toMatchObject({
      ok: false,
      path: 'values.c',
    })
    expect(validateAnswer(spec, { actionId: 'go', values: { c: [] } })).toEqual({
      ok: true,
      actionId: 'go',
      values: undefined,
    })
  })

  test('explicit null counts as absent', () => {
    expect(answer('send', { terms: ['ok'], note: null })).toMatchObject({ ok: true })
    expect(validateAnswer(form, { actionId: 'send', values: null }).ok).toBe(false) // terms required
  })
})

describe('validateAnswer with prototype-ish keys', () => {
  const spec = valid({
    fields: [{ id: 'note', type: 'text', label: 'n' }],
    actions: [{ id: 'go', label: 'Go' }],
  })

  test.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'a %s key in values is not a field',
    (key) => {
      const values = JSON.parse(`{"${key}": "x"}`)
      expect(validateAnswer(spec, { actionId: 'go', values })).toMatchObject({
        ok: false,
        path: `values.${key}`,
      })
    }
  )

  test('inherited members are not read as answers, and output has no inherited keys', () => {
    const values = Object.create({ note: 'inherited' })
    const r = validateAnswer(spec, { actionId: 'go', values })
    expect(r).toEqual({ ok: true, actionId: 'go', values: undefined })
  })

  test('does not pollute Object.prototype', () => {
    const r = validateAnswer(spec, {
      actionId: 'go',
      values: JSON.parse('{"__proto__": {"x": 1}}'),
    })
    expect(r.ok).toBe(false)
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })
})

describe('deriveInteractionState', () => {
  const base = { hasResponse: false, closedAt: null, expiresAt: null, appGone: false, now: NOW }
  const past = new Date(NOW.getTime() - 1000)
  const future = new Date(NOW.getTime() + 1000)

  test('OPEN by default and before expiry', () => {
    expect(deriveInteractionState(base)).toBe('OPEN')
    expect(deriveInteractionState({ ...base, expiresAt: future })).toBe('OPEN')
  })

  test('EXPIRED at and after expiresAt', () => {
    expect(deriveInteractionState({ ...base, expiresAt: past })).toBe('EXPIRED')
    expect(deriveInteractionState({ ...base, expiresAt: NOW })).toBe('EXPIRED')
  })

  test('CLOSED by closedAt or app gone', () => {
    expect(deriveInteractionState({ ...base, closedAt: past })).toBe('CLOSED')
    expect(deriveInteractionState({ ...base, appGone: true })).toBe('CLOSED')
  })

  test('a recorded answer still reads RESPONDED when the app is gone', () => {
    expect(deriveInteractionState({ ...base, hasResponse: true, appGone: true })).toBe('RESPONDED')
  })

  test('precedence RESPONDED > CLOSED > EXPIRED > OPEN', () => {
    expect(
      deriveInteractionState({
        hasResponse: true,
        closedAt: past,
        expiresAt: past,
        appGone: true,
        now: NOW,
      })
    ).toBe('RESPONDED')
    expect(deriveInteractionState({ ...base, closedAt: past, expiresAt: past })).toBe('CLOSED')
    expect(deriveInteractionState({ ...base, appGone: true, expiresAt: past })).toBe('CLOSED')
  })
})

describe('toClientInteraction', () => {
  const stored = valid({
    ref: 'secret-ref',
    expiresAt: '2026-11-12T00:00:00Z',
    fields: [{ id: 'n', type: 'text', label: 'n' }],
    actions: [{ id: 'a', label: 'A' }],
  })

  test('strips ref (and tray), converts expiresAt to a Date', () => {
    const out = toClientInteraction(stored, 'OPEN')
    expect(out).toEqual({
      v: 1,
      fields: stored.fields,
      actions: stored.actions,
      state: 'OPEN',
      expiresAt: new Date('2026-11-12T00:00:00Z'),
    })
    expect(JSON.stringify(out)).not.toContain('secret-ref')
    expect('response' in out).toBe(false)
  })

  test('includes the response; purged values are absent', () => {
    const respondedAt = new Date('2026-11-10T07:00:00Z')
    expect(
      toClientInteraction(stored, 'RESPONDED', { actionId: 'a', values: { n: 'x' }, respondedAt })
        .response
    ).toEqual({ actionId: 'a', values: { n: 'x' }, respondedAt })
    const purged = toClientInteraction(stored, 'RESPONDED', {
      actionId: 'a',
      values: null,
      respondedAt,
    })
    expect(purged.response).toEqual({ actionId: 'a', respondedAt })
    expect('values' in purged.response!).toBe(false)
  })

  test('no expiresAt, no key', () => {
    expect('expiresAt' in toClientInteraction(valid(approveReject), 'OPEN')).toBe(false)
  })
})

describe('trayShape', () => {
  const text = (extra: object = {}) => ({ id: 'note', type: 'text', label: 'Note', ...extra })

  test('no fields: one button per action', () => {
    expect(trayShape(valid(approveReject))).toEqual({
      kind: 'buttons',
      actions: [
        { id: 'approve', label: 'อนุมัติ', icon: 'check', bg: true },
        { id: 'reject', label: 'ไม่อนุมัติ', icon: 'x', destructive: true, bg: true },
      ],
    })
  })

  test('confirm makes an action open the app', () => {
    const shape = trayShape(
      valid({
        actions: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', style: 'destructive', confirm: { title: 'Sure?' } },
        ],
      })
    )
    expect(shape).toEqual({
      kind: 'buttons',
      actions: [
        { id: 'a', label: 'A', bg: true },
        { id: 'b', label: 'B', destructive: true, bg: false },
      ],
    })
  })

  test('tray:false gives null', () => {
    expect(trayShape(valid({ ...approveReject, tray: false }))).toBeNull()
  })

  test('one text field and one action: inline reply', () => {
    expect(
      trayShape(
        valid({
          fields: [text({ placeholder: 'พิมพ์...', required: true })],
          actions: [{ id: 'send', label: 'ส่ง' }],
        })
      )
    ).toEqual({
      kind: 'reply',
      fieldId: 'note',
      placeholder: 'พิมพ์...',
      submitLabel: 'ส่ง',
      actionId: 'send',
      bg: true,
    })
  })

  test('reply without placeholder has no placeholder key; requires of the reply field is fine', () => {
    const shape = trayShape(
      valid({ fields: [text()], actions: [{ id: 'send', label: 'ส่ง', requires: ['note'] }] })
    )
    expect(shape).toEqual({
      kind: 'reply',
      fieldId: 'note',
      submitLabel: 'ส่ง',
      actionId: 'send',
      bg: true,
    })
  })

  test('a confirming single action is one open-the-app button, not a reply box', () => {
    expect(
      trayShape(
        valid({
          fields: [text()],
          actions: [{ id: 'a', label: 'A', icon: 'check', confirm: { title: 't' } }],
        })
      )
    ).toEqual({
      kind: 'buttons',
      actions: [{ id: 'a', label: 'A', icon: 'check', bg: false }],
    })
  })

  test('only optional text fields with several actions: buttons; requires opens the form', () => {
    expect(
      trayShape(
        valid({
          fields: [text()],
          actions: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B', requires: ['note'] },
          ],
        })
      )
    ).toEqual({
      kind: 'buttons',
      actions: [
        { id: 'a', label: 'A', bg: true },
        { id: 'b', label: 'B', bg: false },
      ],
    })
  })

  test('two optional text fields, one action: buttons (not a reply)', () => {
    expect(
      trayShape(
        valid({
          fields: [text(), text({ id: 'other' })],
          actions: [{ id: 'a', label: 'A' }],
        })
      )?.kind
    ).toBe('buttons')
  })

  test('required text with several actions: form only', () => {
    expect(
      trayShape(
        valid({
          fields: [text({ required: true })],
          actions: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        })
      )
    ).toBeNull()
  })

  test('radio or checkbox: form only', () => {
    const options = [
      { id: 'a', label: 'a' },
      { id: 'b', label: 'b' },
    ]
    expect(
      trayShape(
        valid({
          fields: [{ id: 'r', type: 'radio', label: 'r', options }],
          actions: [{ id: 'g', label: 'g' }],
        })
      )
    ).toBeNull()
    expect(
      trayShape(
        valid({
          fields: [{ id: 'c', type: 'checkbox', label: 'c', options }],
          actions: [{ id: 'g', label: 'g' }],
        })
      )
    ).toBeNull()
    expect(
      trayShape(
        valid({
          fields: [text(), { id: 'c', type: 'checkbox', label: 'c', options }],
          actions: [{ id: 'g', label: 'g' }],
        })
      )
    ).toBeNull()
  })
})

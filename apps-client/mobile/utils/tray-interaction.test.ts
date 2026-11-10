import { describe, expect, test } from 'vitest'

import {
  buildTrayCategory,
  DEFAULT_ACTION_IDENTIFIER,
  MAX_TRAY_CATEGORIES,
  outcomeForStatus,
  parseDismiss,
  parseTrayInteraction,
  pendingActionFromResponse,
  selectCategoriesToPrune,
  submissionFromResponse,
  supportsTrayInteraction,
  tapToDetailData,
  trayCategoryId,
} from './tray-interaction'

const buttons = {
  id: 'n1',
  kind: 'buttons',
  actions: [
    { id: 'approve', label: 'อนุมัติ', icon: 'check', bg: true },
    { id: 'reject', label: 'ไม่อนุมัติ', icon: 'x', destructive: true, bg: false },
  ],
}
const reply = {
  id: 'n2',
  kind: 'reply',
  fieldId: 'note',
  placeholder: 'พิมพ์',
  submitLabel: 'ส่ง',
  actionId: 'send',
  bg: true,
}

describe('parseTrayInteraction', () => {
  test('parses buttons from the JSON string the push carries', () => {
    expect(parseTrayInteraction(JSON.stringify(buttons))).toEqual(buttons)
  })

  test('parses reply', () => {
    expect(parseTrayInteraction(JSON.stringify(reply))).toEqual(reply)
  })

  test('accepts an already-parsed object', () => {
    expect(parseTrayInteraction(buttons)?.kind).toBe('buttons')
  })

  test('drops an unknown icon rather than rejecting the notification', () => {
    const parsed = parseTrayInteraction({
      ...buttons,
      actions: [{ id: 'a', label: 'A', icon: 'rocket', bg: true }],
    })
    expect(parsed).toEqual({
      id: 'n1',
      kind: 'buttons',
      actions: [{ id: 'a', label: 'A', bg: true }],
    })
  })

  test.each([
    ['undefined', undefined],
    ['not json', '{nope'],
    ['an array', '[]'],
    ['no id', JSON.stringify({ ...buttons, id: '' })],
    ['unknown kind', JSON.stringify({ ...buttons, kind: 'form' })],
    ['no actions', JSON.stringify({ ...buttons, actions: [] })],
    ['bg missing', JSON.stringify({ ...buttons, actions: [{ id: 'a', label: 'A' }] })],
    [
      'duplicate action ids',
      JSON.stringify({
        ...buttons,
        actions: [
          { id: 'a', label: 'A', bg: true },
          { id: 'a', label: 'B', bg: true },
        ],
      }),
    ],
    ['reply without field', JSON.stringify({ ...reply, fieldId: undefined })],
    ['reply with non-string placeholder', JSON.stringify({ ...reply, placeholder: 3 })],
  ])('returns null for %s', (_name, raw) => {
    expect(parseTrayInteraction(raw)).toBeNull()
  })
})

describe('buildTrayCategory', () => {
  test('buttons: opensAppToForeground is the opposite of bg', () => {
    const category = buildTrayCategory(parseTrayInteraction(buttons)!)
    expect(category.identifier).toBe('pple.ix.n1')
    expect(category.actions.map((a) => [a.identifier, a.options.opensAppToForeground])).toEqual([
      ['approve', false],
      ['reject', true],
    ])
    expect(category.actions[1].options.isDestructive).toBe(true)
    expect(category.actions.every((a) => a.textInput === undefined)).toBe(true)
  })

  test('reply: one action with a text input', () => {
    const category = buildTrayCategory(parseTrayInteraction(reply)!)
    expect(category.actions).toEqual([
      {
        identifier: 'send',
        buttonTitle: 'ส่ง',
        textInput: { submitButtonTitle: 'ส่ง', placeholder: 'พิมพ์' },
        options: { opensAppToForeground: false, isAuthenticationRequired: true },
      },
    ])
  })

  test('reply without placeholder still builds', () => {
    const category = buildTrayCategory(parseTrayInteraction({ ...reply, placeholder: undefined })!)
    expect(category.actions[0].textInput?.placeholder).toBe('')
  })
})

describe('selectCategoriesToPrune', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => trayCategoryId(`c${i}`))

  test('does nothing at or under the limit', () => {
    expect(selectCategoriesToPrune(ids(MAX_TRAY_CATEGORIES), [])).toEqual([])
  })

  test('removes only the excess', () => {
    const all = ids(MAX_TRAY_CATEGORIES + 3)
    expect(selectCategoriesToPrune(all, [])).toEqual(all.slice(0, 3))
  })

  test('never removes categories that are kept', () => {
    const all = ids(MAX_TRAY_CATEGORIES + 2)
    expect(selectCategoriesToPrune(all, [all[0], all[1]])).toEqual([all[2], all[3]])
  })

  test('never removes categories outside the prefix', () => {
    const all = [...ids(MAX_TRAY_CATEGORIES + 1), 'other.category']
    expect(selectCategoriesToPrune(all, [])).not.toContain('other.category')
  })

  test('removes fewer if everything else is kept', () => {
    const all = ids(MAX_TRAY_CATEGORIES + 5)
    expect(selectCategoriesToPrune(all, all.slice(0, MAX_TRAY_CATEGORIES + 4))).toEqual([
      all[MAX_TRAY_CATEGORIES + 4],
    ])
  })
})

describe('outcomeForStatus', () => {
  test('200 dismisses', () => {
    expect(outcomeForStatus(200)).toEqual({ kind: 'dismiss' })
  })
  test('409 and 410', () => {
    expect(outcomeForStatus(409)).toMatchObject({ reason: 'answered', message: 'คุณตอบกลับแล้ว' })
    expect(outcomeForStatus(410)).toMatchObject({ reason: 'closed', message: 'ปิดรับคำตอบแล้ว' })
  })
  test.each([400, 401, 500, undefined])('%s is the generic failure', (status) => {
    expect(outcomeForStatus(status)).toMatchObject({
      reason: 'failed',
      message: 'ส่งคำตอบไม่สำเร็จ แตะเพื่อตอบในแอป',
    })
  })
})

describe('submissionFromResponse', () => {
  const data = (interaction: object) => ({
    notificationId: 'n',
    pple_response_token: 'v1.tok',
    pple_interaction: JSON.stringify(interaction),
  })

  test('a bg button submits its action id', () => {
    expect(
      submissionFromResponse({
        actionIdentifier: 'approve',
        categoryIdentifier: 'pple.ix.n1',
        data: data(buttons),
      })
    ).toEqual({ notificationId: 'n', token: 'v1.tok', body: { actionId: 'approve' } })
  })

  test('a foreground action is left to the app', () => {
    expect(
      submissionFromResponse({
        actionIdentifier: 'reject',
        categoryIdentifier: 'pple.ix.n1',
        data: data(buttons),
      })
    ).toBeNull()
  })

  test('the body tap is not a submission', () => {
    expect(
      submissionFromResponse({
        actionIdentifier: DEFAULT_ACTION_IDENTIFIER,
        categoryIdentifier: 'pple.ix.n1',
        data: data(buttons),
      })
    ).toBeNull()
  })

  test('reply sends the text under the field id', () => {
    expect(
      submissionFromResponse({
        actionIdentifier: 'send',
        userText: 'เห็นด้วย',
        categoryIdentifier: 'pple.ix.n2',
        data: data(reply),
      })
    ).toEqual({
      notificationId: 'n',
      token: 'v1.tok',
      body: { actionId: 'send', values: { note: 'เห็นด้วย' } },
    })
  })

  test('not ours: other category, missing token, mismatched category', () => {
    expect(
      submissionFromResponse({
        actionIdentifier: 'a',
        categoryIdentifier: 'x',
        data: data(buttons),
      })
    ).toBeNull()
    expect(
      submissionFromResponse({
        actionIdentifier: 'approve',
        categoryIdentifier: 'pple.ix.n1',
        data: { notificationId: 'n', pple_interaction: JSON.stringify(buttons) },
      })
    ).toBeNull()
    expect(
      submissionFromResponse({
        actionIdentifier: 'approve',
        categoryIdentifier: 'pple.ix.other',
        data: data(buttons),
      })
    ).toBeNull()
  })
})

describe('pendingActionFromResponse', () => {
  const base = {
    categoryIdentifier: 'pple.ix.n1',
    data: { pple_interaction: JSON.stringify(buttons) },
  }
  test('a foreground action is pending', () => {
    expect(pendingActionFromResponse({ ...base, actionIdentifier: 'reject' })).toBe('reject')
  })
  test('bg action, default tap and unknown action are not', () => {
    expect(pendingActionFromResponse({ ...base, actionIdentifier: 'approve' })).toBeUndefined()
    expect(
      pendingActionFromResponse({ ...base, actionIdentifier: DEFAULT_ACTION_IDENTIFIER })
    ).toBeUndefined()
    expect(pendingActionFromResponse({ ...base, actionIdentifier: 'zzz' })).toBeUndefined()
  })
})

describe('misc', () => {
  test('parseDismiss', () => {
    expect(parseDismiss({ pple_dismiss: 'n1' })).toBe('n1')
    expect(parseDismiss({ pple_dismiss: '' })).toBeNull()
    expect(parseDismiss({ title: 't' })).toBeNull()
    expect(parseDismiss(undefined)).toBeNull()
  })
  test('tapToDetailData keeps only the routing keys', () => {
    expect(
      tapToDetailData({
        link: '{}',
        notificationId: 'n',
        pple_response_token: 't',
        pple_interaction: '{}',
      })
    ).toEqual({ link: '{}', notificationId: 'n' })
  })
  test('supportsTrayInteraction', () => {
    expect(supportsTrayInteraction('android')).toBe(true)
    expect(supportsTrayInteraction('ios')).toBe(true)
    expect(supportsTrayInteraction('web')).toBe(false)
  })
})

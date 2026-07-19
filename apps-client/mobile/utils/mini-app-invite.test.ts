import { describe, expect, test } from 'vitest'

import { inviteErrorMessage, isStaleInviteError, sortInvitesByNewestFirst } from './mini-app-invite'

const edenError = (code: string) => ({ status: 404, value: { error: { code } } })

describe('inviteErrorMessage', () => {
  test('explains a withdrawn invitation', () => {
    expect(inviteErrorMessage(edenError('MINI_APP_INVITE_NOT_FOUND'))).toBe(
      'คำเชิญนี้ถูกยกเลิกไปแล้ว'
    )
  })

  test('explains an invitation already answered elsewhere', () => {
    expect(inviteErrorMessage(edenError('MINI_APP_INVITE_ALREADY_RESPONDED'))).toBe(
      'คุณตอบคำเชิญนี้ไปแล้ว'
    )
  })

  test('falls back to the generic message for an unmapped code', () => {
    expect(inviteErrorMessage(edenError('INTERNAL_SERVER_ERROR'))).toBe('เกิดข้อผิดพลาดบางอย่าง')
  })

  test('falls back for a network failure, which carries no error envelope', () => {
    expect(inviteErrorMessage(new Error('Network request failed'))).toBe('เกิดข้อผิดพลาดบางอย่าง')
    expect(inviteErrorMessage(null)).toBe('เกิดข้อผิดพลาดบางอย่าง')
  })
})

describe('isStaleInviteError', () => {
  test('a withdrawn or already-answered invitation is stale — the lists need refetching', () => {
    expect(isStaleInviteError(edenError('MINI_APP_INVITE_NOT_FOUND'))).toBe(true)
    expect(isStaleInviteError(edenError('MINI_APP_INVITE_ALREADY_RESPONDED'))).toBe(true)
  })

  test('a server error is not stale — nothing on screen is known to be wrong', () => {
    expect(isStaleInviteError(edenError('INTERNAL_SERVER_ERROR'))).toBe(false)
  })

  // Regression: refetching here reset the cached mini-app list and then failed
  // to refill it, so answering an invitation offline emptied the app grid.
  test('an offline failure is not stale, so it never clears the cached app list', () => {
    expect(isStaleInviteError(new Error('Network request failed'))).toBe(false)
    expect(isStaleInviteError(null)).toBe(false)
  })
})

describe('sortInvitesByNewestFirst', () => {
  test('puts the most recent invitation first', () => {
    const invites = [
      { miniAppId: 'older', createdAt: new Date('2026-07-01T00:00:00Z') },
      { miniAppId: 'newest', createdAt: new Date('2026-07-19T00:00:00Z') },
      { miniAppId: 'middle', createdAt: new Date('2026-07-10T00:00:00Z') },
    ]

    expect(sortInvitesByNewestFirst(invites).map((invite) => invite.miniAppId)).toEqual([
      'newest',
      'middle',
      'older',
    ])
  })

  test('accepts the serialised dates the API actually returns over the wire', () => {
    const invites = [
      { miniAppId: 'older', createdAt: '2026-07-01T00:00:00.000Z' },
      { miniAppId: 'newest', createdAt: '2026-07-19T00:00:00.000Z' },
    ]

    expect(sortInvitesByNewestFirst(invites).map((invite) => invite.miniAppId)).toEqual([
      'newest',
      'older',
    ])
  })

  test('leaves the caller’s array untouched', () => {
    const invites = [
      { miniAppId: 'older', createdAt: new Date('2026-07-01T00:00:00Z') },
      { miniAppId: 'newest', createdAt: new Date('2026-07-19T00:00:00Z') },
    ]

    sortInvitesByNewestFirst(invites)

    expect(invites.map((invite) => invite.miniAppId)).toEqual(['older', 'newest'])
  })
})

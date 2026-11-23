import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { describe, expect, test } from 'vitest'

import { LINK_NAME_MAX_LENGTH, linkNameTakenError, normalizeLinkName } from './link-name'

describe('normalizeLinkName', () => {
  test('stores a trimmed lowercase path segment', () => {
    expect(normalizeLinkName('  Donate  ')).toBe('donate')
  })

  test.each([
    ['empty', ''],
    ['blank', '   '],
    ['slash', 'a/b'],
    ['query', 'a?x=1'],
    ['hash', 'a#h'],
    ['space', 'my name'],
    ['percent', 'a%2e'],
    ['dot', '.'],
    ['dotdot', '..'],
    ['too long', 'a'.repeat(LINK_NAME_MAX_LENGTH + 1)],
  ])('rejects %s', (_label, input) => {
    expect(normalizeLinkName(input)).toBeNull()
  })
})

describe('linkNameTakenError', () => {
  test('keeps an explicit Link Name clash', () => {
    expect(
      linkNameTakenError({
        code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
        message: 'Slug clashes with a held Link Name',
      })
    ).toEqual({
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: 'Slug clashes with a held Link Name',
    })
  })

  test('reads the database trigger backstop as a Link Name clash, not a slug clash', () => {
    expect(
      linkNameTakenError({
        code: 'UNIQUE_CONSTRAINT_FAILED',
        message: 'mini-app slug clashes with a held link name',
      })?.code
    ).toBe(InternalErrorCode.MINI_APP_LINK_NAME_TAKEN)
  })

  test('leaves a slug/slug unique failure alone', () => {
    expect(
      linkNameTakenError({
        code: 'UNIQUE_CONSTRAINT_FAILED',
        message: 'Unique constraint failed on the fields: (`slug`)',
      })
    ).toBeNull()
  })
})

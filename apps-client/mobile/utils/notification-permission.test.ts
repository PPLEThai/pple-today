import { describe, expect, it } from 'vitest'

import {
  fromAndroidRequestResult,
  fromIosAuthorizationStatus,
  isBareAppLink,
  OS_PROMPT_QUIET_MS,
  registrationFingerprint,
  SETTINGS_PROMPT_INTERVAL_MS,
  shouldShowSettingsPrompt,
} from './notification-permission'

describe('fromAndroidRequestResult', () => {
  it('maps the three PermissionsAndroid results', () => {
    expect(fromAndroidRequestResult('granted')).toBe('granted')
    expect(fromAndroidRequestResult('denied')).toBe('denied')
    expect(fromAndroidRequestResult('never_ask_again')).toBe('blocked')
  })
})

describe('fromIosAuthorizationStatus', () => {
  it('treats authorized, provisional and ephemeral as granted', () => {
    expect(fromIosAuthorizationStatus(1)).toBe('granted')
    expect(fromIosAuthorizationStatus(2)).toBe('granted')
    expect(fromIosAuthorizationStatus(3)).toBe('granted')
  })

  it('treats a refusal as blocked: iOS never prompts twice', () => {
    expect(fromIosAuthorizationStatus(0)).toBe('blocked')
  })

  it('treats not determined as still askable', () => {
    expect(fromIosAuthorizationStatus(-1)).toBe('denied')
  })
})

describe('registrationFingerprint', () => {
  const body = { deviceToken: 'abc', platform: 'IOS' }

  it('is equal for the same user and body', () => {
    expect(registrationFingerprint('u1', body)).toBe(registrationFingerprint('u1', { ...body }))
  })

  it('changes with the token or the user', () => {
    expect(registrationFingerprint('u1', body)).not.toBe(
      registrationFingerprint('u1', { ...body, deviceToken: 'def' })
    )
    expect(registrationFingerprint('u1', body)).not.toBe(registrationFingerprint('u2', body))
  })
})

describe('shouldShowSettingsPrompt', () => {
  const now = 1_000_000_000_000

  it('never shows unless the OS has stopped prompting', () => {
    for (const permission of ['granted', 'denied'] as const) {
      expect(
        shouldShowSettingsPrompt({
          permission,
          lastShownAt: null,
          lastOsPromptAt: null,
          now,
          openedByAppLink: true,
        })
      ).toBe(false)
    }
  })

  it('shows the first time notifications are blocked', () => {
    expect(
      shouldShowSettingsPrompt({
        permission: 'blocked',
        lastShownAt: null,
        lastOsPromptAt: null,
        now,
        openedByAppLink: false,
      })
    ).toBe(true)
  })

  it('waits out the interval after it was last shown', () => {
    const base = {
      permission: 'blocked' as const,
      lastOsPromptAt: null,
      now,
      openedByAppLink: false,
    }
    expect(shouldShowSettingsPrompt({ ...base, lastShownAt: now - 1000 })).toBe(false)
    expect(
      shouldShowSettingsPrompt({ ...base, lastShownAt: now - SETTINGS_PROMPT_INTERVAL_MS })
    ).toBe(true)
  })

  it('ignores the interval when opened by the bare app link', () => {
    expect(
      shouldShowSettingsPrompt({
        permission: 'blocked',
        lastShownAt: now - 1000,
        lastOsPromptAt: null,
        now,
        openedByAppLink: true,
      })
    ).toBe(true)
  })

  it('stays away right after the OS prompt was answered, even from the app link', () => {
    const base = {
      permission: 'blocked' as const,
      lastShownAt: null,
      now,
      openedByAppLink: true,
    }
    expect(shouldShowSettingsPrompt({ ...base, lastOsPromptAt: now - 1000 })).toBe(false)
    expect(shouldShowSettingsPrompt({ ...base, lastOsPromptAt: now - OS_PROMPT_QUIET_MS })).toBe(
      true
    )
  })
})

describe('isBareAppLink', () => {
  it('matches the bare scheme, with or without a slash or query', () => {
    expect(isBareAppLink('pple-today://', 'pple-today')).toBe(true)
    expect(isBareAppLink('pple-today:///', 'pple-today')).toBe(true)
    expect(isBareAppLink('pple-today://?from=pple-id', 'pple-today')).toBe(true)
  })

  it('does not match a link with a destination or another scheme', () => {
    expect(isBareAppLink('pple-today://profile', 'pple-today')).toBe(false)
    expect(isBareAppLink('pple-today://notification/1', 'pple-today')).toBe(false)
    expect(isBareAppLink('https://example.com', 'pple-today')).toBe(false)
  })
})

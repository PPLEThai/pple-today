import { MiniAppTier } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { AppNotificationAudienceInput, resolveAppAudience } from './app-audience'

const OWNER = 'owner-sub'
const INVITEE = 'invitee-sub'
const STRANGER = 'stranger-sub'

const makeInput = (
  overrides: Partial<AppNotificationAudienceInput> = {}
): AppNotificationAudienceInput => ({
  tier: MiniAppTier.LIVE,
  ownerSub: OWNER,
  appUserIds: [],
  acceptedInviteUserIds: new Set(),
  ...overrides,
})

describe('resolveAppAudience', () => {
  describe('the App User registry bounds every tier', () => {
    test('an app with no App Users reaches nobody, whatever its tier', () => {
      for (const tier of [MiniAppTier.DRAFT, MiniAppTier.BETA, MiniAppTier.LIVE]) {
        expect(resolveAppAudience(makeInput({ tier, appUserIds: [] }))).toEqual([])
      }
    })

    test('someone invited and accepted but who never opened the app is not reachable', () => {
      const audience = resolveAppAudience(
        makeInput({
          tier: MiniAppTier.BETA,
          appUserIds: [],
          acceptedInviteUserIds: new Set([INVITEE]),
        })
      )

      // Consent to try an app is not the same as having opened it. The App User
      // registry is the notification boundary, so an accepted invite alone
      // reaches nobody.
      expect(audience).toEqual([])
    })
  })

  describe('DRAFT tier', () => {
    test('reaches only the owner, even when others have somehow opened it', () => {
      const audience = resolveAppAudience(
        makeInput({
          tier: MiniAppTier.DRAFT,
          appUserIds: [OWNER, STRANGER, INVITEE],
          acceptedInviteUserIds: new Set([INVITEE]),
        })
      )

      expect(audience).toEqual([OWNER])
    })

    test('reaches nobody when the owner has not opened their own draft', () => {
      expect(
        resolveAppAudience(makeInput({ tier: MiniAppTier.DRAFT, appUserIds: [STRANGER] }))
      ).toEqual([])
    })
  })

  describe('BETA tier', () => {
    test('reaches the owner and accepted invitees who have opened the app', () => {
      const audience = resolveAppAudience(
        makeInput({
          tier: MiniAppTier.BETA,
          appUserIds: [OWNER, INVITEE, STRANGER],
          acceptedInviteUserIds: new Set([INVITEE]),
        })
      )

      expect(new Set(audience)).toEqual(new Set([OWNER, INVITEE]))
      expect(audience).not.toContain(STRANGER)
    })

    test('a revoked or declined invite drops the tester from the audience', () => {
      // The invitee opened the app while their invite stood; the invite has
      // since gone. Eligibility is read live, so they fall out immediately.
      const audience = resolveAppAudience(
        makeInput({
          tier: MiniAppTier.BETA,
          appUserIds: [OWNER, INVITEE],
          acceptedInviteUserIds: new Set(),
        })
      )

      expect(audience).toEqual([OWNER])
    })
  })

  describe('LIVE tier', () => {
    test('reaches every App User', () => {
      const audience = resolveAppAudience(
        makeInput({ tier: MiniAppTier.LIVE, appUserIds: [OWNER, INVITEE, STRANGER] })
      )

      expect(new Set(audience)).toEqual(new Set([OWNER, INVITEE, STRANGER]))
    })

    test('an app with no owner recorded still reaches its App Users', () => {
      expect(
        resolveAppAudience(
          makeInput({ tier: MiniAppTier.LIVE, ownerSub: null, appUserIds: [STRANGER] })
        )
      ).toEqual([STRANGER])
    })
  })

  describe('tier changes narrow and widen the audience', () => {
    const appUserIds = [OWNER, INVITEE, STRANGER]
    const acceptedInviteUserIds = new Set([INVITEE])

    test('the same App Users resolve differently at each tier', () => {
      const at = (tier: MiniAppTier) =>
        new Set(resolveAppAudience(makeInput({ tier, appUserIds, acceptedInviteUserIds })))

      // Promoting widens; demoting narrows. Nothing is stored per tier — the
      // audience is derived at send time, so a tier change takes effect at once.
      expect(at(MiniAppTier.DRAFT)).toEqual(new Set([OWNER]))
      expect(at(MiniAppTier.BETA)).toEqual(new Set([OWNER, INVITEE]))
      expect(at(MiniAppTier.LIVE)).toEqual(new Set([OWNER, INVITEE, STRANGER]))
    })
  })

  test('the audience is deduplicated', () => {
    // The owner could appear twice if they were also invited as a tester.
    const audience = resolveAppAudience(
      makeInput({
        tier: MiniAppTier.BETA,
        appUserIds: [OWNER, OWNER, INVITEE],
        acceptedInviteUserIds: new Set([OWNER, INVITEE]),
      })
    )

    expect(audience).toHaveLength(2)
    expect(new Set(audience)).toEqual(new Set([OWNER, INVITEE]))
  })
})

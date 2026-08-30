import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { Check } from '@sinclair/typebox/value'
import { Static, t } from 'elysia'
import { ok } from 'neverthrow'

import { AD_ROLE_PREFIX } from '../constants/roles'

/**
 * Subset of the SSO `GET /oidc/v1/userinfo` response that PPLE Today relies on.
 *
 * Only the `ad` object is described, and every nested level is optional/nullable
 * because the AD system omits the whole block (or parts of it) for users without
 * an active role. Extra fields returned by the userinfo endpoint are ignored.
 */
export const AdUserInfo = t.Object({
  ad: t.Optional(
    t.Nullable(
      t.Object({
        activeRole: t.Optional(t.Nullable(t.String())),
        eligibleRoles: t.Optional(t.Nullable(t.Array(t.String()))),
        roleMapping: t.Optional(t.Nullable(t.Record(t.String(), t.String()))),
        user: t.Optional(
          t.Nullable(
            t.Object({
              role: t.Optional(t.Nullable(t.String())),
              metadata: t.Optional(
                t.Nullable(
                  t.Object({
                    ad: t.Optional(
                      t.Nullable(
                        t.Object({
                          extra_roles: t.Optional(t.Nullable(t.Array(t.String()))),
                        })
                      )
                    ),
                  })
                )
              ),
            })
          )
        ),
      })
    )
  ),
})
export type AdUserInfo = Static<typeof AdUserInfo>

/**
 * Fetch the SSO AD user info for the given user access token.
 */
export const fetchAdUserInfo = async (token: string, oidcUrl: string) => {
  const response = await fetch(`${oidcUrl}/oidc/v1/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return err({
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An error occurred while fetching the SSO AD user info',
    })
  }

  const body = await response.json()

  if (!Check(AdUserInfo, body)) {
    return err({
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Invalid SSO AD user info format',
    })
  }

  return ok(body)
}

/**
 * Resolve the PPLE Today visible roles from the active role context.
 *
 * Returns the `pple-ad:`-prefixed union of the active role's main role
 * (`ad.user.role`) and extra roles (`ad.user.metadata.ad.extra_roles`).
 * Returns an empty list when the user has no active role.
 */
export const resolveVisibleRoles = (userInfo: AdUserInfo): string[] => {
  const mainRole = userInfo.ad?.user?.role
  if (!mainRole) return []

  const extraRoles = userInfo.ad?.user?.metadata?.ad?.extra_roles ?? []

  return [mainRole, ...extraRoles]
    .filter((role): role is string => Boolean(role))
    .map((role) => `${AD_ROLE_PREFIX}${role}`)
}

/**
 * The caller's `pple-ad:`-prefixed visible roles, resolved live from their own
 * bearer token.
 *
 * Shared by both guards so user and admin authorisation read the same source:
 * the AD active role, not the OIDC token's `pple_roles` — a Zitadel mirror that
 * does not follow a role switch.
 */
export const fetchAdVisibleRoles = async (
  headers: Record<string, string | undefined>,
  oidcUrl: string
) => {
  const token = headers['authorization']?.replace('Bearer', '').trim()
  if (!token)
    return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

  const userInfo = await fetchAdUserInfo(token, oidcUrl)
  if (userInfo.isErr()) return err(userInfo.error)

  return ok(resolveVisibleRoles(userInfo.value))
}

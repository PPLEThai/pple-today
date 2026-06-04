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

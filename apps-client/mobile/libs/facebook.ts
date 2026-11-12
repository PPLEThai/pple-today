import { AccessToken, LoginManager } from 'react-native-fbsdk-next'
import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'

import { reactQueryClient } from './api-client'

export const FACEBOOK_PAGE_PERMISSIONS = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_metadata',
]

export class FacebookLoginCancelledError extends Error {
  constructor() {
    super('User cancelled Facebook login')
  }
}

/** Why the cached token was or was not reused, for `facebook-connect-attempt.ts`. */
export interface FacebookCachedTokenCheck {
  result: 'none' | 'missing_permissions' | 'refresh_failed' | 'reused'
  missingPermissions?: string[]
  error?: unknown
}

/**
 * Where `getCachedFacebookPageAccessToken` reports its decision; set for the
 * duration of one `getFacebookPageAccessToken` call. A module variable rather
 * than a parameter keeps that function's signature, which other work edits
 * next to, unchanged.
 */
let reportCachedTokenCheck: (check: FacebookCachedTokenCheck) => void = () => {}

/**
 * Returns a Facebook user access token carrying the page permissions.
 *
 * The SDK persists the token from an earlier login, so reuse it when it already
 * holds every page permission and Facebook still accepts it. Only fall back to
 * `LoginManager.logInWithPermissions` — which switches to the Facebook app or a
 * browser — when there is no usable token.
 */
export async function getFacebookPageAccessToken(
  onCachedTokenCheck?: (check: FacebookCachedTokenCheck) => void
): Promise<string> {
  reportCachedTokenCheck = onCachedTokenCheck ?? (() => {})
  const cachedToken = await getCachedFacebookPageAccessToken().finally(() => {
    reportCachedTokenCheck = () => {}
  })
  if (cachedToken) return cachedToken

  // Start from a clean SDK state. Whatever token, authentication token or
  // profile the SDK still holds is unusable at this point, and leftovers from an
  // earlier failed login made every new login fail with com.facebook.sdk.login
  // until the app was reinstalled.
  LoginManager.logOut()
  const loginResult = await LoginManager.logInWithPermissions(FACEBOOK_PAGE_PERMISSIONS)
  if (loginResult.isCancelled) {
    throw new FacebookLoginCancelledError()
  }
  const accessToken = await AccessToken.getCurrentAccessToken()
  if (!accessToken?.accessToken) {
    throw new Error('Failed to get facebook access token')
  }
  return accessToken.accessToken
}

/**
 * A short, user-visible description of a Facebook login failure. Native SDK
 * errors reject with a generic "Login Failed" message and carry the real cause
 * in `domain` / `userInfo`, so include those when present.
 */
export function describeFacebookError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const native = error as Error & { domain?: string; userInfo?: unknown }
  const details = [native.domain, native.userInfo ? JSON.stringify(native.userInfo) : undefined]
    .filter(Boolean)
    .join(' ')
  return (details ? `${error.message} (${details})` : error.message).slice(0, 300)
}

async function getCachedFacebookPageAccessToken(): Promise<string | null> {
  const report = reportCachedTokenCheck
  const current = await AccessToken.getCurrentAccessToken()
  if (!current?.accessToken) {
    report({ result: 'none' })
    return null
  }
  const missing = missingPagePermissions(current.permissions)
  if (missing.length > 0) {
    report({ result: 'missing_permissions', missingPermissions: missing })
    return null
  }
  try {
    // Round-trips to Facebook: extends the token, refreshes its permission list,
    // and fails if the token expired or the user revoked the app.
    await AccessToken.refreshCurrentAccessTokenAsync()
  } catch (error) {
    console.warn('Cached Facebook access token is no longer valid', error)
    LoginManager.logOut()
    report({ result: 'refresh_failed', error })
    return null
  }
  const refreshed = await AccessToken.getCurrentAccessToken()
  if (!refreshed?.accessToken) {
    report({ result: 'none' })
    return null
  }
  const refreshedMissing = missingPagePermissions(refreshed.permissions)
  if (refreshedMissing.length > 0) {
    report({ result: 'missing_permissions', missingPermissions: refreshedMissing })
    return null
  }
  report({ result: 'reused' })
  return refreshed.accessToken
}

function missingPagePermissions(permissions: string[]) {
  const granted = new Set(permissions)
  return FACEBOOK_PAGE_PERMISSIONS.filter((permission) => !granted.has(permission))
}

export const useFacebookPagesQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'facebookPages'],
  fetcher: async (variables: { facebookAccessToken: string }): Promise<FacebookPageData[]> => {
    // Note that we limit the page size at 100
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=access_token,id,name,picture{cache_key,url}&limit=100&access_token=${variables.facebookAccessToken}`
    )
    if (!response.ok) {
      // The token was rejected (expired or revoked after we read it). Drop the
      // SDK's cached token so the next attempt goes through a fresh login.
      if (response.status === 400 || response.status === 401) {
        LoginManager.logOut()
      }
      throw response
    }
    // return response.json()
    const json: FacebookPageResponse = await response.json()
    return json.data
  },
})

interface FacebookPageData {
  access_token: string
  id: string
  name: string
  picture: {
    data: {
      cache_key: string
      url: string
    }
  }
}
interface FacebookPageResponse {
  data: FacebookPageData[]
  paging: {
    cursors: {
      before: string
      after: string
    }
  }
}

/**
 * Whether this user may connect a Facebook page — decided by the backend from
 * their SSO AD roles, so who qualifies can change without an app release.
 *
 * Cached for an hour: it only moves when the user's AD roles change, and the one
 * change they can make from inside the app — switching บทบาท — invalidates this
 * from `useSwitchRoleMutation`.
 */
const FACEBOOK_CONFIG_CACHE_MS = 60 * 60 * 1000

export const useFacebookConfigQuery = () =>
  reactQueryClient.useQuery(
    '/facebook/config',
    {},
    {
      staleTime: FACEBOOK_CONFIG_CACHE_MS,
      gcTime: FACEBOOK_CONFIG_CACHE_MS,
    }
  )

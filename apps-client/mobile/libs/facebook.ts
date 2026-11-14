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

/** The person finished Facebook login but declined some page permissions. */
export class FacebookMissingPermissionsError extends Error {
  constructor(readonly missingPermissions: string[]) {
    super(`Facebook login is missing permissions: ${missingPermissions.join(', ')}`)
  }
}

export const FACEBOOK_MISSING_PERMISSIONS_MESSAGE = {
  text1: 'ยังไม่ได้อนุญาตสิทธิ์ที่จำเป็น',
  text2: 'กรุณาเชื่อมต่อใหม่และอนุญาตสิทธิ์ทั้งหมดที่ขอ',
}

/**
 * Forgets the Facebook login on this device so the next connect starts over.
 */
export function clearFacebookLogin() {
  LoginManager.logOut()
}

/**
 * Disconnects the app from the person's Facebook account: revokes every
 * permission they granted, then forgets the login on this device. The next
 * connect then shows the full Facebook dialog again, where they can pick
 * another account, other pages, or the permissions they declined before.
 * Logging out alone is not enough, because Facebook remembers which pages and
 * permissions the person granted and does not ask again.
 *
 * Revoking de-authorises the app for this Facebook user, which also
 * invalidates page tokens obtained through them, so only call this when the
 * person asks for it and has been warned.
 *
 * Throws if Facebook refuses the revoke, leaving the login in place so the
 * person can try again. A token Facebook no longer accepts has nothing left to
 * revoke through it, so that counts as disconnected.
 */
export async function disconnectFacebook(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`,
    { method: 'DELETE' }
  )
  if (!response.ok && !(await isInvalidTokenResponse(response))) {
    throw new Error(`Failed to revoke Facebook permissions: ${response.status}`)
  }
  clearFacebookLogin()
}

/** Whether a failed Graph API response is OAuth error 190 (dead token). */
async function isInvalidTokenResponse(response: Response) {
  try {
    const body = (await response.clone().json()) as { error?: { code?: unknown } }
    return body.error?.code === 190
  } catch {
    return false
  }
}

/**
 * Whether `useFacebookPagesQuery` failed because Facebook rejected the token
 * (its fetcher has then already dropped the token), rather than a network
 * error or a Facebook outage.
 */
export function isFacebookTokenRejection(error: unknown) {
  return (
    typeof Response !== 'undefined' &&
    error instanceof Response &&
    (error.status === 400 || error.status === 401)
  )
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
  const missing = missingPagePermissions(accessToken.permissions)
  if (missing.length > 0) {
    // Forget the partial grant; the SDK asks again for declined permissions on
    // the next login.
    clearFacebookLogin()
    throw new FacebookMissingPermissionsError(missing)
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
  // Facebook's 4xx answers (bad token, missing permission) do not change on
  // retry, so show the failure at once; still retry network errors and 5xx.
  retry: (failureCount, error) =>
    !(typeof Response !== 'undefined' && error instanceof Response && error.status < 500) &&
    failureCount < 2,
  fetcher: async (variables: { facebookAccessToken: string }): Promise<FacebookPageData[]> => {
    // Note that we limit the page size at 100
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=access_token,id,name,tasks,picture{cache_key,url}&limit=100&access_token=${variables.facebookAccessToken}`
    )
    if (!response.ok) {
      // The token was rejected (expired or revoked after we read it). Drop the
      // SDK's cached token so the next attempt goes through a fresh login.
      if (isFacebookTokenRejection(response)) {
        clearFacebookLogin()
      }
      throw response
    }
    // return response.json()
    const json: FacebookPageResponse = await response.json()
    return json.data
  },
})

/**
 * Whether the person's role on the page lets PPLE Today follow it. Approval
 * subscribes to the page's feed, which Facebook only allows for people who can
 * moderate the page (admins, editors and moderators).
 */
export function canManageFacebookPage(page: FacebookPageData) {
  // Facebook does not return tasks for every page. Without them, let the
  // server's check at link time decide.
  return page.tasks?.includes('MODERATE') ?? true
}

export interface FacebookPageData {
  access_token: string
  id: string
  name: string
  /** The person's tasks on the page, e.g. MANAGE, MODERATE, CREATE_CONTENT. */
  tasks?: string[]
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

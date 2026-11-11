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

/**
 * Returns a Facebook user access token carrying the page permissions.
 *
 * The SDK persists the token from an earlier login, so reuse it when it already
 * holds every page permission and Facebook still accepts it. Only fall back to
 * `LoginManager.logInWithPermissions` — which switches to the Facebook app or a
 * browser — when there is no usable token.
 */
export async function getFacebookPageAccessToken(): Promise<string> {
  const cachedToken = await getCachedFacebookPageAccessToken()
  if (cachedToken) return cachedToken

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

async function getCachedFacebookPageAccessToken(): Promise<string | null> {
  const current = await AccessToken.getCurrentAccessToken()
  if (!current?.accessToken) return null
  const granted = new Set(current.permissions)
  if (!FACEBOOK_PAGE_PERMISSIONS.every((permission) => granted.has(permission))) return null
  try {
    // Round-trips to Facebook: extends the token, refreshes its permission list,
    // and fails if the token expired or the user revoked the app.
    await AccessToken.refreshCurrentAccessTokenAsync()
  } catch (error) {
    console.warn('Cached Facebook access token is no longer valid', error)
    LoginManager.logOut()
    return null
  }
  const refreshed = await AccessToken.getCurrentAccessToken()
  if (!refreshed?.accessToken) return null
  const refreshedGranted = new Set(refreshed.permissions)
  if (!FACEBOOK_PAGE_PERMISSIONS.every((permission) => refreshedGranted.has(permission))) {
    return null
  }
  return refreshed.accessToken
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

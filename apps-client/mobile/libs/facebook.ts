import { createQuery } from 'react-query-kit'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'

import { reactQueryClient } from './api-client'

export const useFacebookPagesQuery = createQuery({
  queryKey: [QUERY_KEY_SYMBOL, 'facebookPages'],
  fetcher: async (variables: { facebookAccessToken: string }): Promise<FacebookPageData[]> => {
    // Note that we limit the page size at 100
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=access_token,id,name,picture{cache_key,url}&limit=100&access_token=${variables.facebookAccessToken}`
    )
    if (!response.ok) {
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

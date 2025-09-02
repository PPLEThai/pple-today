import { createQuery } from 'react-query-kit'

import { QUERY_KEY } from '@pple-today/api-client'

export const useFacebookPageQuery = createQuery({
  queryKey: [QUERY_KEY, 'facebookPages'],
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

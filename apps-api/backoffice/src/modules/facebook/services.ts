import node from '@elysiajs/node'
import Elysia from 'elysia'

import serverEnv from '../../config/env'

const FacebookService = new Elysia({ name: 'FacebookService', adapter: node() }).decorate(() => ({
  facebookService: {
    async getFacebookPageAccessToken(code: string, redirectUri: string) {
      const queryParams = new URLSearchParams({
        client_id: serverEnv.FACEBOOK_APP_ID,
        client_secret: serverEnv.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      })
      return fetch(`${serverEnv.FACEBOOK_API_URL}/oauth/access_token?${queryParams.toString()}`)
    },

    async listFacebookPages() {},
  },
}))

export default FacebookService

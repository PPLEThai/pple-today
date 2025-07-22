import node from '@elysiajs/node'
import Elysia from 'elysia'

import { FacebookRequestAccessTokenQuery } from './models'
import FacebookService from './services'

export const facebookController = new Elysia({ name: 'FacebookController', adapter: node() })
  .use(FacebookService)
  .get(
    '/facebook/callback',
    async ({ query, status, facebookService }) => {
      const { code, redirectUri } = query

      try {
        const accessToken = await facebookService.getFacebookPageAccessToken(code, redirectUri)
        console.error('Access Token:', accessToken)
        return status(200)
      } catch (error) {
        console.error('Error fetching access token:', error)
        return status(500)
      }
    },
    {
      query: FacebookRequestAccessTokenQuery,
    }
  )
  .as('scoped')

import { t } from 'elysia'

export const FacebookRequestAccessTokenQuery = t.Object({
  code: t.String({
    description: 'The authorization code received from Facebook after user consent',
  }),
  redirectUri: t.String({
    description: 'The redirect URI used in the OAuth flow',
  }),
})

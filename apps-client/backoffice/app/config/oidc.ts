import { UserManager } from 'oidc-client-ts'

import { clientEnv } from './clientEnv'

export const userManager = new UserManager({
  authority: clientEnv.OIDC_AUTHORITY_URL,
  client_id: clientEnv.OIDC_CLIENT_ID,
  redirect_uri: clientEnv.OIDC_REDIRECT_URL,
  response_type: 'code',
  scope: `openid profile phone ${clientEnv.OIDC_ADDITIONAL_SCOPE}`,
})

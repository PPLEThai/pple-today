import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

import { userQueryOptions } from '~/core/auth'
import { reactQueryClient } from '~/libs/api-client'
import { queryClient } from '~/main'

import { clientEnv } from './clientEnv'

export const userManager = new UserManager({
  authority: clientEnv.OIDC_AUTHORITY_URL,
  client_id: clientEnv.OIDC_CLIENT_ID,
  redirect_uri: `${clientEnv.OIDC_REDIRECT_URL}/login`,
  response_type: 'code',
  scope: `openid profile phone ${clientEnv.OIDC_ADDITIONAL_SCOPE}`,
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),
})

// subscribe to local storage events to sync user state between tabs
// note that this only triggers for other tabs, not the current one
window.addEventListener('storage', (event) => {
  if (event.storageArea === window.localStorage && event.key?.startsWith('oidc.user')) {
    queryClient.resetQueries({ queryKey: userQueryOptions.queryKey })
    queryClient.resetQueries({ queryKey: reactQueryClient.getQueryKey('/admin/auth/me', {}) })
  }
})

import { createContext, useContext, useEffect, useState } from 'react'

import { PPLEMiniApp } from '@pple-today/mini-app'

import { clientEnv } from '~/config/clientEnv'

const AuthContext = createContext<{
  token: string | null
  setToken: (token: string | null) => void
}>({
  token: null,
  setToken: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [ppleMiniAppInstance] = useState(
    typeof window !== 'undefined'
      ? new PPLEMiniApp({
          oauthClientId: clientEnv.OAUTH_CLIENT_ID,
          oauthRedirectUri: clientEnv.OAUTH_REDIRECT_URI,
          oauthUrl: clientEnv.OAUTH_URL,
        })
      : null
  )

  useEffect(() => {
    console.log('Initializing PPLE Mini App...')
    ppleMiniAppInstance?.init()
  }, [ppleMiniAppInstance])

  return (
    <AuthContext.Provider
      value={{ token: ppleMiniAppInstance?.user?.access_token ?? null, setToken: () => {} }}
    >
      {children}
    </AuthContext.Provider>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'

import { PPLEMiniApp, type User } from '@pple-today/mini-app'

import { clientEnv } from '~/config/clientEnv'

const AuthContext = createContext<{
  user: User | null
  isLoading: boolean
}>({
  user: null,
  isLoading: true,
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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await ppleMiniAppInstance?.init()
      setUser(ppleMiniAppInstance?.user ?? null)
      setIsLoading(false)
    }

    init()
  }, [ppleMiniAppInstance])

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>
}

import { createContext, useContext, useEffect, useState } from 'react'

import { PPLEMiniApp, type UserInfo } from '@pplethai/pple-today-miniapp-sdk'

import { clientEnv } from '~/config/clientEnv'

const AuthContext = createContext<{
  user: UserInfo | null
  accessToken: string | null
  isLoading: boolean
}>({
  user: null,
  accessToken: null,
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
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!ppleMiniAppInstance) return
      await ppleMiniAppInstance.init()

      const userProfile = await ppleMiniAppInstance.getProfile()
      const token = await ppleMiniAppInstance.getAccessToken()

      setUser(userProfile)
      setAccessToken(token)
      setIsLoading(false)
    }

    init()
  }, [ppleMiniAppInstance])

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading }}>{children}</AuthContext.Provider>
  )
}

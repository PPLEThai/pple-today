import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts'

import { AccessTokenDetailsSchema, IdTokenPayloadSchema, UserInfoSchema } from './models'

export class PPLEMiniApp {
  private config: { oauthUrl: string; oauthClientId: string; oauthRedirectUri: string }
  private userManager: UserManager
  private _user: User | null = null

  private fetchUserInfo = async (accessToken: string) => {
    const response = await fetch(`${this.config.oauthUrl}/oidc/v1/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) throw new Error('[PPLE Mini App] Failed to fetch user info')

    const userInfo = await response.json()
    const result = await UserInfoSchema.safeParseAsync(userInfo)

    if (!result.success) throw new Error('[PPLE Mini App] Invalid user info format')

    return result.data
  }

  private async extractJWTPayload(token: string) {
    const payloadBase64 = token.split('.')[1]
    const payloadJson = atob(payloadBase64)

    const result = await IdTokenPayloadSchema.safeParseAsync(JSON.parse(payloadJson))

    if (!result.success) throw new Error('[PPLE Mini App] Invalid ID token payload format')

    return result.data
  }

  private async getAccessTokenFromUrl() {
    const searchParams = new URLSearchParams(window.location.search)

    const accessTokenDetails = {
      accessToken: searchParams.get('access_token'),
      idToken: searchParams.get('id_token'),
      tokenType: searchParams.get('token_type'),
      expiresIn: searchParams.get('expires_in'),
    }

    const result = await AccessTokenDetailsSchema.safeParseAsync(accessTokenDetails)

    if (!result.success) return null

    return result.data
  }

  private async storeUserInOIDCClient(accessTokenDetails: AccessTokenDetailsSchema) {
    const userInfo = await this.fetchUserInfo(accessTokenDetails.accessToken)
    const idTokenPayload = await this.extractJWTPayload(accessTokenDetails.idToken)

    const user = new User({
      access_token: accessTokenDetails.accessToken,
      id_token: accessTokenDetails.idToken,
      token_type: accessTokenDetails.tokenType,
      profile: {
        name: userInfo.name,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        updated_at: userInfo.updated_at,
        phone_number: userInfo.phone_number,
        phone_number_verified: userInfo.phone_number_verified,
        aud: idTokenPayload.aud,
        sub: idTokenPayload.sub,
        exp: idTokenPayload.exp,
        iat: idTokenPayload.iat,
        iss: idTokenPayload.iss,
      },
    })

    await this.userManager.storeUser(user)
    return user
  }

  private async loadTokenFromLocalStorage() {
    const tokenString = localStorage.getItem('pple-mini-app-token')

    if (tokenString) {
      const token = JSON.parse(tokenString)
      const result = await AccessTokenDetailsSchema.safeParseAsync(token)

      if (!result.success) throw new Error('[PPLE Mini App] Invalid token format in local storage')

      return result.data
    }

    return null
  }

  private storeTokenInLocalStorage(token: {
    accessToken: string
    idToken: string
    tokenType: string
    expiresIn: string
  }) {
    localStorage.setItem('pple-mini-app-token', JSON.stringify(token))
  }

  private async loadTokenFromSessionStorage() {
    const tokenString = sessionStorage.getItem('pple-mini-app-token')

    if (tokenString) {
      const token = JSON.parse(tokenString)
      const result = await AccessTokenDetailsSchema.safeParseAsync(token)

      if (!result.success) {
        throw new Error('[PPLE Mini App] Invalid token format in session storage')
      }

      return result.data
    }

    return null
  }

  private storeTokenInSessionStorage(token: {
    accessToken: string
    idToken: string
    tokenType: string
    expiresIn: string
  }) {
    sessionStorage.setItem('ppleToken', JSON.stringify(token))
  }

  constructor(config: { oauthUrl: string; oauthClientId: string; oauthRedirectUri: string }) {
    if (typeof window === 'undefined') {
      throw new Error(
        '[PPLE Mini App] PPLEMiniApp can only be instantiated in a browser environment'
      )
    }

    const isMiniApp = this.isMiniApp()

    this.config = config
    this.userManager = new UserManager({
      authority: this.config.oauthUrl,
      client_id: this.config.oauthClientId,
      redirect_uri: this.config.oauthRedirectUri,
      response_type: 'code',
      scope: 'openid profile phone',
      stateStore: new WebStorageStateStore({
        store: isMiniApp ? window.sessionStorage : window.localStorage,
      }),
    })
  }

  async logout() {
    await this.userManager.revokeTokens(['access_token'])
    return await this.userManager.removeUser()
  }

  async init() {
    if (this.isMiniApp()) {
      let token = await this.getAccessTokenFromUrl()

      if (token) {
        this.storeTokenInSessionStorage({
          accessToken: token.accessToken,
          idToken: token.idToken,
          tokenType: token.tokenType,
          expiresIn: token.expiresIn,
        })
      } else {
        token = await this.loadTokenFromSessionStorage()
        if (!token)
          throw new Error('[PPLE Mini App] No access token found in URL or session storage')
      }

      const user = await this.storeUserInOIDCClient(token)
      this._user = user
    } else {
      try {
        const user = await this.userManager.signinCallback()
        if (user) {
          const accessTokenDetails = {
            accessToken: user.access_token,
            idToken: user.id_token as string,
            tokenType: 'Bearer',
            expiresIn: (user.expires_in || 3600).toString(),
          }

          this._user = user
          this.storeTokenInLocalStorage(accessTokenDetails)
        }
      } catch {
        console.warn('[PPLE Mini App] No signin callback to process')

        const token = await this.loadTokenFromLocalStorage()

        if (token) {
          const user = await this.storeUserInOIDCClient(token)
          this._user = user
        } else await this.userManager.signinRedirect()
      }
    }

    console.log('[PPLE Mini App] PPLE Mini App initialized')
  }

  isMiniApp() {
    const queryParams = new URLSearchParams(window.location.search)

    const isHeaderMatch = !!navigator.userAgent.match(/PPLETodayApp\/(\d.\d.\d) MiniApp/)
    const isAccessTokenParamsInUrl = !!queryParams.has('access_token')

    return isHeaderMatch && isAccessTokenParamsInUrl
  }

  get user() {
    if (!this._user) {
      console.warn('[PPLE Mini App] User is not initialized yet. Please call init() first.')
      return null
    }
    return {
      name: this._user.profile.name,
      given_name: this._user.profile.given_name,
      family_name: this._user.profile.family_name,
      access_token: this._user.access_token,
      id_token: this._user.id_token,
    }
  }
}

import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts'

import {
  AccessTokenDetails,
  AccessTokenDetailsSchema,
  IdTokenPayloadSchema,
  UserInfo,
  UserInfoSchema,
} from './models'

export type { User }

export class PPLEMiniApp {
  private config: { oauthUrl: string; oauthClientId: string; oauthRedirectUri: string }
  private userManager: UserManager
  private _user: User | null = null

  private async extractJWTPayload(token: string) {
    const payloadBase64 = token.split('.')[1]
    const payloadJson = atob(payloadBase64)

    const result = await IdTokenPayloadSchema.safeParseAsync(JSON.parse(payloadJson))

    if (!result.success) throw new Error('[PPLE Mini App] Invalid ID token payload format')

    if (result.data.exp <= new Date().getTime() / 1000) {
      await this.logout()
      throw new Error('[PPLE Mini App] ID token has expired')
    }

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

  private async storeUserInOIDCClient() {
    const user = await this.userManager.getUser()

    if (!user?.profile)
      throw new Error('[PPLE Mini App] No existing user profile found in OIDC client')

    if (user.state && (user.state as Record<string, unknown>).isProfileFetched) {
      return user
    }

    const userInfo = await this.fetchProfileByAccessToken(user.access_token)

    const userWithInfo = new User({
      ...user,
      profile: {
        ...user?.profile,
        ...userInfo,
      },
      userState: {
        isProfileFetched: true,
      },
    })

    await this.userManager.storeUser(userWithInfo)
    return userWithInfo
  }

  private async storeJWTProfileInOIDCClient(accessTokenDetails: AccessTokenDetails) {
    const idTokenDetails = await this.extractJWTPayload(accessTokenDetails.idToken)

    const user = new User({
      access_token: accessTokenDetails.accessToken,
      id_token: accessTokenDetails.idToken,
      token_type: accessTokenDetails.tokenType,
      profile: {
        sub: idTokenDetails.sub,
        aud: idTokenDetails.aud,
        iss: idTokenDetails.iss,
        exp: idTokenDetails.exp,
        iat: idTokenDetails.iat,
      },
    })

    await this.userManager.storeUser(user)
    return user
  }

  private async fetchProfileByAccessToken(accessToken: string) {
    const userInfoEndpoint = await this.userManager.metadataService.getUserInfoEndpoint()
    const userInfoResult = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userInfoResult.ok) {
      throw new Error('[PPLE Mini App] Failed to fetch user info from OAuth server')
    }

    const userInfoBody = await userInfoResult.json()

    if (UserInfoSchema.safeParse(userInfoBody).success === false) {
      throw new Error('[PPLE Mini App] Invalid user info format received from OAuth server')
    }

    return userInfoBody
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
      userStore: new WebStorageStateStore({
        store: isMiniApp ? window.sessionStorage : window.localStorage,
      }),
    })
  }

  async init() {
    console.log('[PPLE Mini App] Initializing PPLE Mini App...')

    if (this.isMiniApp()) {
      const token = await this.getAccessTokenFromUrl()

      if (token) {
        const user = await this.storeJWTProfileInOIDCClient(token)

        console.log('[PPLE Mini App] User signed in successfully via Mini App URL parameters')

        this._user = user
      } else {
        const currentUser = await this.userManager.getUser()

        if (currentUser) {
          this._user = currentUser
          console.log('[PPLE Mini App] Existing user found, no need to sign in again')
          return
        }

        throw new Error('[PPLE Mini App] No user is currently logged in in Mini App')
      }
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

          const storedUser = await this.storeJWTProfileInOIDCClient(accessTokenDetails)
          this._user = storedUser

          console.log('[PPLE Mini App] User signed in successfully')
          return
        }

        console.error('[PPLE Mini App] Signin callback did not return a user')
      } catch {
        console.warn('[PPLE Mini App] No signin callback to process')

        const currentUser = await this.userManager.getUser()

        if (currentUser) {
          this._user = currentUser
          console.log('[PPLE Mini App] Existing user found, no need to sign in again')
          return
        }
      }

      console.warn('[PPLE Mini App] Redirecting to sign-in page...')
      await this.userManager.signinRedirect()
    }
  }

  async getAccessToken() {
    if (!this._user) return null

    return this._user.access_token
  }

  async getProfile(): Promise<UserInfo | null> {
    if (!this._user) return null

    const newUser = await this.storeUserInOIDCClient()
    this._user = newUser

    return {
      sub: this._user.profile.sub,
      family_name: this._user.profile.family_name,
      given_name: this._user.profile.given_name,
      phone_number: this._user.profile.phone_number,
      name: this._user.profile.name,
      phone_number_verified: this._user.profile.phone_number_verified,
      updated_at: this._user.profile.updated_at,
    }
  }

  isMiniApp() {
    const queryParams = new URLSearchParams(window.location.search)

    const isHeaderMatch = !!navigator.userAgent.match(/PPLETodayApp\/(\d.\d.\d) MiniApp/)
    const isAccessTokenParamsInUrl = !!queryParams.has('access_token')

    return isHeaderMatch && isAccessTokenParamsInUrl
  }

  async logout() {
    await this.userManager.revokeTokens(['access_token'])
    await this.userManager.removeUser()
  }
}

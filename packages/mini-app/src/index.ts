import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts'

import {
  hasBridge,
  isMiniAppUserAgent,
  requestRoleSwitchFromHost,
  requestSessionFromHost,
} from './bridge'
import {
  AccessTokenDetails,
  AccessTokenDetailsSchema,
  BridgeSession,
  IdTokenPayloadSchema,
  UserInfo,
  UserInfoSchema,
} from './models'
import { fetchRoleInfo, showRoleSwitchDialog, switchRoleOnServer } from './web-role-switcher'

export type { User }

/**
 * How a `switchRole()` call ended. `unavailable` covers every case where no
 * picker was shown: outside PPLE Today, an older host, a logged-out user, or a
 * user with only one role to choose from (`reason` says which).
 */
export type RoleSwitchResult =
  | { status: 'switched'; activePersonId: number }
  | { status: 'unchanged' }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string }

// Refresh slightly early so a request already in flight does not carry a token
// that expires before the server reads it.
const REFRESH_MARGIN_SECONDS = 30

export class PPLEMiniApp {
  private config: { oauthUrl: string; oauthClientId: string; oauthRedirectUri: string }
  private userManager: UserManager
  private _user: User | null = null
  /**
   * The query string PPLE Today launched the app with, read once at
   * construction.
   *
   * `init()` is async and usually runs from an effect, so a client-side router
   * has every chance to rewrite the URL first — a catch-all redirect, a
   * canonicalising `replace`, a route guard. Re-reading `window.location` then
   * would show no `access_token`, the host would look like a plain browser, and
   * a session PPLE Today had already handed over would be thrown away for a
   * sign-in redirect. The launch URL is a fact about how the app was opened; it
   * does not change when the route does.
   *
   * The URL is not the only source any more: it can be missing altogether (a
   * server-side redirect drops the query string before any JS runs) or carry
   * a token for a different app (after navigating between mini apps), so
   * `init()` falls back to asking the host over the session bridge.
   */
  private readonly launchSearch: string
  /** Shared by concurrent `getAccessToken()` calls so the host is asked once. */
  private refreshPromise: Promise<User | null> | null = null
  private isRoleDialogOpen = false

  private async decodeIdToken(token: string) {
    try {
      const payloadBase64 = token.split('.')[1]
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
      const result = await IdTokenPayloadSchema.safeParseAsync(JSON.parse(payloadJson))
      return result.success ? result.data : null
    } catch {
      return null
    }
  }

  private async extractJWTPayload(token: string) {
    const payload = await this.decodeIdToken(token)

    if (!payload) throw new Error('[PPLE Mini App] Invalid ID token payload format')

    if (payload.exp <= new Date().getTime() / 1000) {
      await this.logout()
      throw new Error('[PPLE Mini App] ID token has expired')
    }

    return payload
  }

  private async getAccessTokenFromUrl() {
    const searchParams = new URLSearchParams(this.launchSearch)

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
      expires_at: Math.floor(Date.now() / 1000) + Number(accessTokenDetails.expiresIn),
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

  /**
   * A launch token is only usable if it was minted for this app and is still
   * valid. The host may have loaded another mini app first, and an expired
   * token must not stop us from asking the bridge for a fresh one.
   *
   * Without a bridge there is nothing better to fall back to, so an older host's
   * launch token is taken as it always was — the audience check would otherwise
   * turn away a token this SDK used to accept.
   */
  private async isLaunchTokenUsable(token: AccessTokenDetails) {
    if (!hasBridge()) return true

    const payload = await this.decodeIdToken(token.idToken)
    if (!payload) return false

    const clientId = this.config.oauthClientId
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    const isForThisApp = audiences.includes(clientId) || payload.azp === clientId

    return isForThisApp && payload.exp > Date.now() / 1000
  }

  private async requestUserFromBridge() {
    const session = await requestSessionFromHost(this.config.oauthClientId)
    if (!session) return null

    return await this.storeBridgeSession(session)
  }

  private async storeBridgeSession(session: BridgeSession) {
    try {
      return await this.storeJWTProfileInOIDCClient({
        accessToken: session.accessToken,
        idToken: session.idToken,
        tokenType: session.tokenType,
        expiresIn: session.expiresIn.toString(),
      })
    } catch (error) {
      console.warn('[PPLE Mini App] Could not use the session from the host', error)
      return null
    }
  }

  constructor(config: { oauthUrl: string; oauthClientId: string; oauthRedirectUri: string }) {
    if (typeof window === 'undefined') {
      throw new Error(
        '[PPLE Mini App] PPLEMiniApp can only be instantiated in a browser environment'
      )
    }

    this.launchSearch = window.location.search

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
      // Fast path: older hosts (and the first app a new host opens) put the
      // session in the launch URL, which needs no round trip.
      const token = await this.getAccessTokenFromUrl()

      if (token && (await this.isLaunchTokenUsable(token))) {
        this._user = await this.storeJWTProfileInOIDCClient(token)

        console.log('[PPLE Mini App] User signed in successfully via Mini App URL parameters')
        return
      }

      if (hasBridge()) {
        const user = await this.requestUserFromBridge()

        if (user) {
          this._user = user
          console.log('[PPLE Mini App] User signed in successfully via host session bridge')
          return
        }
      }

      const currentUser = await this.userManager.getUser()

      if (currentUser) {
        this._user = currentUser
        console.log('[PPLE Mini App] Existing user found, no need to sign in again')
        return
      }

      throw new Error('[PPLE Mini App] No user is currently logged in in Mini App')
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
    if (!this._user) throw new Error('[PPLE Mini App] No user is currently logged in')

    const user = this._user
    const isExpiring =
      user.expires_at !== undefined && user.expires_at - Date.now() / 1000 <= REFRESH_MARGIN_SECONDS

    if (!isExpiring || !hasBridge()) return user.access_token

    this.refreshPromise ??= this.requestUserFromBridge().finally(() => {
      this.refreshPromise = null
    })

    const refreshed = await this.refreshPromise
    if (refreshed) this._user = refreshed

    // If the host could not refresh, the old token may still work for a moment.
    return (refreshed ?? user).access_token
  }

  /**
   * Lets the user switch บทบาท without leaving the app, and resolves once they
   * have chosen.
   *
   * Inside PPLE Today the host shows its native picker. Anywhere else — a
   * browser, or an older PPLE Today without the session bridge — the SDK shows
   * its own picker and switches through PPLE ID directly.
   *
   * On `switched`, read whatever the app shows per role again: inside PPLE
   * Today the session has already been replaced with one minted for the new
   * role, and `getProfile()` refetches the profile in both cases.
   */
  async switchRole(): Promise<RoleSwitchResult> {
    if (hasBridge()) {
      const response = await requestRoleSwitchFromHost(this.config.oauthClientId)

      // A host that never answered is an older one: its WebView is still a
      // browser, so the SDK's own picker works there too.
      if (response.status !== 'unavailable' || response.reason !== 'no-ack') {
        return await this.applyHostRoleSwitch(response)
      }
    }

    return await this.switchRoleInPage()
  }

  private async applyHostRoleSwitch(
    response: Exclude<Awaited<ReturnType<typeof requestRoleSwitchFromHost>>, { reason: 'no-ack' }>
  ): Promise<RoleSwitchResult> {
    switch (response.status) {
      case 'switched': {
        if (response.session) {
          const user = await this.storeBridgeSession(response.session)
          if (user) this._user = user
        }
        return { status: 'switched', activePersonId: response.activePersonId }
      }
      case 'unchanged':
      case 'cancelled':
        return { status: response.status }
      default:
        return { status: 'unavailable', reason: response.reason }
    }
  }

  private async switchRoleInPage(): Promise<RoleSwitchResult> {
    if (!this._user) return { status: 'unavailable', reason: 'not-signed-in' }
    // One picker at a time; a second call while one is open would stack them.
    if (this.isRoleDialogOpen) return { status: 'unavailable', reason: 'busy' }

    const accessToken = await this.getAccessToken()

    let roleInfo
    try {
      roleInfo = await fetchRoleInfo(this.config.oauthUrl, accessToken)
    } catch (error) {
      // A CORS failure lands here too: PPLE ID must allow this app's origin.
      console.warn('[PPLE Mini App] Could not load roles from PPLE ID', error)
      return { status: 'unavailable', reason: 'error' }
    }

    if (roleInfo.persons.length < 2) return { status: 'unavailable', reason: 'no-eligible-persons' }

    this.isRoleDialogOpen = true
    try {
      const chosen = await showRoleSwitchDialog({
        persons: roleInfo.persons,
        activePersonId: roleInfo.activePersonId,
        onConfirm: (person) => switchRoleOnServer(this.config.oauthUrl, accessToken, person),
      })

      if (!chosen) return { status: 'cancelled' }
      if (chosen.id === roleInfo.activePersonId) return { status: 'unchanged' }

      await this.markProfileStale()
      return { status: 'switched', activePersonId: chosen.id }
    } finally {
      this.isRoleDialogOpen = false
    }
  }

  /** The cached profile was fetched for the previous role; refetch it next time. */
  private async markProfileStale() {
    if (!this._user) return

    const user = new User({ ...this._user, userState: { isProfileFetched: false } })
    await this.userManager.storeUser(user)
    this._user = user
  }

  async getProfile(): Promise<UserInfo | null> {
    if (!this._user) throw new Error('[PPLE Mini App] No user is currently logged in')

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
    const queryParams = new URLSearchParams(this.launchSearch)

    const isHeaderMatch = isMiniAppUserAgent()
    const isAccessTokenParamsInUrl = queryParams.has('access_token')

    // Either way of receiving a session counts: the URL (older hosts) or the
    // bridge, which works even after a redirect dropped the query string.
    return isHeaderMatch && (hasBridge() || isAccessTokenParamsInUrl)
  }

  async logout() {
    await this.userManager.revokeTokens(['access_token'])
    await this.userManager.removeUser()
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebView, WebViewMessageEvent } from 'react-native-webview'

import type { QueryClient } from '@tanstack/react-query'

import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import {
  ackReply,
  apiErrorCode,
  type BridgeReply,
  buildReplyScript,
  deniedReply,
  type MiniAppSession,
  okReply,
  originOf,
  parseBridgeRequest,
  resolvePageUrl,
  roleSwitchAckReply,
  roleSwitchCancelledReply,
  roleSwitchDeniedReply,
  type RoleSwitchResponse,
  roleSwitchSwitchedReply,
  roleSwitchUnchangedReply,
  SessionCache,
  type SessionDeniedReason,
} from '@app/utils/mini-app-bridge'
import { type MiniAppRoleMismatch, roleMismatchFromError } from '@app/utils/mini-app-role-gate'

import { useSwitchToPerson } from './use-switch-to-person'

/** The app a bridge request turned out to come from, for the top bar. */
export interface BridgeResolvedApp {
  appName: string
  /** The app's registered URL, without tokens — what the copy button copies. */
  baseUrl: string
}

type Outcome =
  | { status: 'ok'; session: MiniAppSession }
  | { status: 'denied'; reason: SessionDeniedReason }

interface RolePrompt {
  id: number
  mismatch: MiniAppRoleMismatch
  answer: (accepted: boolean) => void
}

/** What the server said about the app a page claims to be. */
type AppResolution =
  | { kind: 'resolved'; app: BridgeResolvedApp; session: MiniAppSession | null }
  | { kind: 'mismatch'; mismatch: MiniAppRoleMismatch }
  | { kind: 'not-found' }
  | { kind: 'error' }

type RoleSwitchChoice =
  | { status: 'cancelled' }
  | { status: 'unchanged' }
  | { status: 'switched'; personId: number }

interface RoleSwitchPrompt {
  id: number
  /** Null while the app is still being resolved: the picker shows a spinner. */
  appName: string | null
  /** The switch went through and the new person's session is being minted. */
  isFinishing: boolean
  finish: (choice: RoleSwitchChoice) => void
}

// Unlike the opening prompt, nothing is behind the bridge's prompt but the app
// already on screen — so the lists are refreshed in place, never reset.
const invalidateMiniAppLists = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: reactQueryClient.getQueryKey('/mini-app/invites') }),
    queryClient.invalidateQueries({ queryKey: reactQueryClient.getQueryKey('/mini-app') }),
  ])

/**
 * The host side of the session bridge (packages/mini-app/BRIDGE.md) for one
 * mini-app WebView: answers `pple:session-request` messages for whichever app
 * is on screen, asking the user through the role prompt when the server wants
 * them to decide, and `pple:role-switch-request` messages with the native
 * บทบาท picker.
 *
 * Both kinds of request can raise a dialog, and only one is ever on screen:
 * a role-switch request while a role prompt is up (or queued) is denied as
 * busy, and a role prompt raised while the switcher is up waits its turn.
 */
export function useSessionBridge({
  webViewRef,
  onResolved,
}: {
  webViewRef: React.RefObject<WebView | null>
  /** A request resolved to a known app; `origin` is the page that asked. */
  onResolved: (app: BridgeResolvedApp, origin: string) => void
}) {
  const session = useSession()
  // Requests outlive renders (the prompt can sit for a minute), so they read
  // the latest values through refs rather than the closure they started in.
  const signedInRef = useRef(!!session)
  signedInRef.current = !!session
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  const cacheRef = useRef(new SessionCache())
  // Apps already resolved, per cache key — a cache hit still relabels the bar.
  const appsRef = useRef(new Map<string, BridgeResolvedApp>())
  // One server round trip (and at most one prompt) per app and origin, however
  // many requests the page fires while it is in flight.
  const inFlightRef = useRef(new Map<string, Promise<Outcome>>())
  // The main frame's URL as the native layer last reported it — see
  // `resolvePageUrl` for why the event URL alone is not enough on Android.
  const mainFrameUrlRef = useRef<string | null>(null)

  const [prompts, setPrompts] = useState<RolePrompt[]>([])
  // Role prompts asked for but not yet answered — counted here rather than
  // read from `prompts`, which only catches up on the next render.
  const openRolePromptsRef = useRef(0)
  const promptIdRef = useRef(0)
  const [roleSwitchPrompt, setRoleSwitchPrompt] = useState<RoleSwitchPrompt | null>(null)
  // Held from the moment a role-switch request is taken on until it is
  // answered, so a second one cannot slip in while the first resolves its app.
  const roleSwitchBusyRef = useRef(false)

  const { switchToPerson, isSwitching, hasActiveRole, eligiblePersons, activePersonId } =
    useSwitchToPerson(invalidateMiniAppLists)
  const eligiblePersonsRef = useRef(eligiblePersons)
  eligiblePersonsRef.current = eligiblePersons
  const hasActiveRoleRef = useRef(hasActiveRole)
  hasActiveRoleRef.current = hasActiveRole

  useEffect(() => {
    // Sessions belong to the signed-in user; signing out must not leave one
    // to be handed to the next page that asks.
    if (!session) {
      cacheRef.current.clear()
      appsRef.current.clear()
    }
  }, [session])

  const reply = useCallback(
    (origin: string, message: BridgeReply) => {
      webViewRef.current?.injectJavaScript(buildReplyScript(origin, message))
    },
    [webViewRef]
  )

  const askRole = (mismatch: MiniAppRoleMismatch) =>
    new Promise<boolean>((resolve) => {
      const id = ++promptIdRef.current
      openRolePromptsRef.current += 1
      setPrompts((queue) => [
        ...queue,
        {
          id,
          mismatch,
          answer: (accepted) => {
            openRolePromptsRef.current -= 1
            setPrompts((current) => current.filter((prompt) => prompt.id !== id))
            resolve(accepted)
          },
        },
      ])
    })

  const requestApp = async (
    clientId: string,
    pageUrl: string,
    acknowledgeRoleMismatch: boolean
  ): Promise<AppResolution> => {
    let response
    try {
      response = await fetchClient('/auth/mini-app/client/:clientId', {
        method: 'POST',
        params: { clientId },
        query: { pageUrl, acknowledgeRoleMismatch: acknowledgeRoleMismatch || undefined },
      })
    } catch {
      return { kind: 'error' }
    }

    if (response.error) {
      const mismatch = roleMismatchFromError(response.error)
      if (mismatch) return { kind: 'mismatch', mismatch }
      if (apiErrorCode(response.error) === 'MINI_APP_NOT_FOUND') return { kind: 'not-found' }
      return { kind: 'error' }
    }

    const { appName, baseUrl, session: resolvedSession } = response.data
    return { kind: 'resolved', app: { appName, baseUrl }, session: resolvedSession }
  }

  /** Records a resolved app: labels the bar and caches its session, if any. */
  const remember = (
    clientId: string,
    origin: string,
    resolved: Extract<AppResolution, { kind: 'resolved' }>
  ) => {
    appsRef.current.set(SessionCache.key(clientId, origin), resolved.app)
    onResolvedRef.current(resolved.app, origin)
    if (resolved.session) cacheRef.current.set(clientId, origin, resolved.session)
  }

  const exchange = async (
    clientId: string,
    origin: string,
    pageUrl: string,
    acknowledgeRoleMismatch: boolean
  ): Promise<Outcome> => {
    const resolved = await requestApp(clientId, pageUrl, acknowledgeRoleMismatch)

    switch (resolved.kind) {
      case 'mismatch':
        // Already waived and still refused: nothing more the user can do.
        if (acknowledgeRoleMismatch) return { status: 'denied', reason: 'error' }
        // Cancel only declines this request — the app on screen stays open,
        // unlike the prompt on opening, where there is nothing behind it.
        if (!(await askRole(resolved.mismatch))) {
          return { status: 'denied', reason: 'role-declined' }
        }
        return exchange(clientId, origin, pageUrl, true)
      case 'not-found':
        return { status: 'denied', reason: 'not-found' }
      case 'error':
        return { status: 'denied', reason: 'error' }
    }

    remember(clientId, origin, resolved)
    if (!resolved.session) return { status: 'denied', reason: 'no-auth-required' }
    return { status: 'ok', session: resolved.session }
  }

  const resolveSession = (clientId: string, origin: string, pageUrl: string): Promise<Outcome> => {
    // Asking the server would only fail; the page can offer its own sign-in.
    if (!signedInRef.current) {
      return Promise.resolve({ status: 'denied', reason: 'not-signed-in' })
    }

    const key = SessionCache.key(clientId, origin)
    const cached = cacheRef.current.get(clientId, origin)
    if (cached) {
      const app = appsRef.current.get(key)
      if (app) onResolvedRef.current(app, origin)
      return Promise.resolve({ status: 'ok', session: cached })
    }

    const pending = inFlightRef.current.get(key)
    if (pending) return pending

    const request = exchange(clientId, origin, pageUrl, false).finally(() => {
      inFlightRef.current.delete(key)
    })
    inFlightRef.current.set(key, request)
    return request
  }

  const resolveRoleSwitch = async (
    requestId: string,
    clientId: string,
    origin: string,
    pageUrl: string
  ): Promise<RoleSwitchResponse> => {
    if (!signedInRef.current) return roleSwitchDeniedReply(requestId, 'not-signed-in')
    if (roleSwitchBusyRef.current || openRolePromptsRef.current > 0) {
      return roleSwitchDeniedReply(requestId, 'busy')
    }

    // Not loaded yet is not the same as having nobody to switch to.
    if (!hasActiveRoleRef.current) return roleSwitchDeniedReply(requestId, 'error')
    if (eligiblePersonsRef.current.length < 2) {
      return roleSwitchDeniedReply(requestId, 'no-eligible-persons')
    }

    roleSwitchBusyRef.current = true
    const id = ++promptIdRef.current
    // Touches this request's picker only, should another have replaced it.
    const updatePrompt = (patch: Partial<RoleSwitchPrompt>) =>
      setRoleSwitchPrompt((current) => (current?.id === id ? { ...current, ...patch } : current))
    let choose!: (choice: RoleSwitchChoice) => void
    const chosen = new Promise<RoleSwitchChoice>((resolve) => {
      choose = resolve
    })

    try {
      // The picker goes up at once — the user tapped something and should see
      // it answer. An app this WebView has already resolved (the page asked
      // for its session first, or was opened with one) needs no round trip.
      // Any other is resolved behind a spinner, so only a registered app at
      // its own origin ever gets a choice out of the user.
      const known = appsRef.current.get(SessionCache.key(clientId, origin))
      setRoleSwitchPrompt({
        id,
        appName: known?.appName ?? null,
        isFinishing: false,
        finish: (next) => {
          // A switch keeps the picker up, busy, until the new session is
          // minted; anything else closes it now.
          if (next.status === 'switched') updatePrompt({ isFinishing: true })
          else setRoleSwitchPrompt((current) => (current?.id === id ? null : current))
          choose(next)
        },
      })

      if (known) {
        onResolvedRef.current(known, origin)
      } else {
        // The role list is waived: the user is already inside this app, and a
        // list mismatch is exactly what they may be trying to fix by switching.
        const resolved = await requestApp(clientId, pageUrl, true)
        if (resolved.kind === 'not-found') return roleSwitchDeniedReply(requestId, 'not-found')
        if (resolved.kind !== 'resolved') return roleSwitchDeniedReply(requestId, 'error')
        remember(clientId, origin, resolved)
        updatePrompt({ appName: resolved.app.appName })
      }

      const choice = await chosen
      if (choice.status === 'cancelled') return roleSwitchCancelledReply(requestId)
      if (choice.status === 'unchanged') return roleSwitchUnchangedReply(requestId)

      // A fresh session for the new person, so the app's token carries the
      // new role. The waiver again: switching from inside an app must not
      // lock the user out of it by its own role list.
      const again = await requestApp(clientId, pageUrl, true)
      if (again.kind === 'resolved') {
        remember(clientId, origin, again)
        return roleSwitchSwitchedReply(requestId, choice.personId, again.session)
      }
      // The switch itself went through, so the page is told so — without a
      // session it can ask the bridge for one again.
      console.warn('Mini app re-exchange after role switch failed', { clientId, kind: again.kind })
      return roleSwitchSwitchedReply(requestId, choice.personId, null)
    } finally {
      setRoleSwitchPrompt((current) => (current?.id === id ? null : current))
      roleSwitchBusyRef.current = false
    }
  }

  const onMessage = (event: WebViewMessageEvent) => {
    const request = parseBridgeRequest(event.nativeEvent.data)
    if (!request) return

    // The URL comes from the native layer; anything the message says about
    // where it came from is ignored. A page with no web origin cannot be
    // guarded on reply, so it gets no ack and its SDK falls back.
    const eventUrl = event.nativeEvent.url
    const origin = originOf(eventUrl)
    if (!origin) return

    const pageUrl = resolvePageUrl(eventUrl, mainFrameUrlRef.current)

    // Ack first, before any network call: it tells the SDK this host speaks
    // the bridge, so it waits for the answer instead of falling back.
    if (request.type === 'pple:role-switch-request') {
      reply(origin, roleSwitchAckReply(request.requestId))
      void (async () => {
        reply(origin, await resolveRoleSwitch(request.requestId, request.clientId, origin, pageUrl))
      })()
      return
    }

    reply(origin, ackReply(request.requestId))
    void (async () => {
      const outcome = await resolveSession(request.clientId, origin, pageUrl)
      reply(
        origin,
        outcome.status === 'ok'
          ? okReply(request.requestId, outcome.session)
          : deniedReply(request.requestId, outcome.reason)
      )
    })()
  }

  /** Records a session handed out outside the bridge (the slug exchange on open). */
  const seedSession = useCallback(
    (clientId: string, baseUrl: string, app: BridgeResolvedApp, seed: MiniAppSession) => {
      const origin = originOf(baseUrl)
      if (!origin) return
      cacheRef.current.set(clientId, origin, seed)
      appsRef.current.set(SessionCache.key(clientId, origin), app)
    },
    []
  )

  const trackMainFrameUrl = useCallback((url: string) => {
    mainFrameUrlRef.current = url
  }, [])

  const activePrompt = prompts[0] ?? null

  const confirmPrompt = async (personId: number | null) => {
    if (!activePrompt || isSwitching) return
    const switched = personId != null && personId !== activePersonId
    if (!(await switchToPerson(personId))) return
    // Sessions minted for the previous person carry their roles; a page that
    // asks again after the switch should get one minted for the new person.
    if (switched) cacheRef.current.clear()
    activePrompt.answer(true)
  }

  const confirmRoleSwitch = async (personId: number | null) => {
    if (!roleSwitchPrompt || roleSwitchPrompt.appName == null || isSwitching) return
    if (personId == null || personId === activePersonId) {
      roleSwitchPrompt.finish({ status: 'unchanged' })
      return
    }
    // On failure the user has been told and the picker stays up for another try.
    if (!(await switchToPerson(personId))) return
    // Sessions minted for the previous person carry their roles.
    cacheRef.current.clear()
    roleSwitchPrompt.finish({ status: 'switched', personId })
  }

  return {
    onMessage,
    seedSession,
    trackMainFrameUrl,
    rolePrompt: activePrompt && {
      // Keys the dialog, so a queued prompt starts fresh rather than on the
      // previous one's selection.
      id: activePrompt.id,
      appName: activePrompt.mismatch.appName,
      requiredRoles: activePrompt.mismatch.requiredRoles,
      eligiblePersons,
      activePersonId,
      isSubmitting: isSwitching,
      onCancel: () => activePrompt.answer(false),
      onConfirm: confirmPrompt,
    },
    roleSwitchPrompt: roleSwitchPrompt && {
      // Keys the dialog, so each request starts on the active person.
      id: roleSwitchPrompt.id,
      appName: roleSwitchPrompt.appName,
      eligiblePersons,
      activePersonId,
      isLoading: roleSwitchPrompt.appName == null,
      isSubmitting: isSwitching || roleSwitchPrompt.isFinishing,
      onCancel: () => roleSwitchPrompt.finish({ status: 'cancelled' }),
      onConfirm: confirmRoleSwitch,
    },
  }
}

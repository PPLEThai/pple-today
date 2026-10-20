import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { ArrowLeftIcon, CopyIcon, TriangleAlertIcon, XIcon } from 'lucide-react-native'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { refreshMiniAppLists } from '@app/components/mini-app/invite-inbox'
import { MiniAppRoleGateDialog } from '@app/components/mini-app/role-gate-dialog'
import { MiniAppRoleSwitchDialog } from '@app/components/mini-app/role-switch-dialog'
import { reactQueryClient } from '@app/libs/api-client'
import { miniAppUrlWithPath } from '@app/utils/mini-app'
import { findMiniAppForUrl, hostnameOf, originOf } from '@app/utils/mini-app-bridge'
import { roleMismatchFromError } from '@app/utils/mini-app-role-gate'

import { type BridgeResolvedApp, useSessionBridge } from './use-session-bridge'
import { useSwitchToPerson } from './use-switch-to-person'

export interface MiniAppWebViewHandle {
  /**
   * Navigates the web view back one page. Returns false when it has no history
   * to go back to, so the caller can fall through to its own back behaviour.
   */
  goBack: () => boolean
}

export interface MiniAppWebViewProps {
  slug: string
  path?: string
  /** Leaves the mini app: the top bar's close button and the role prompt's cancel. */
  onClose: () => void
  /**
   * The bar with web back, app name (tap to copy URL) and close. Defaults to
   * true; mini apps embedded as a tab hide it and own the top safe area.
   */
  showTopBar?: boolean
  ref?: React.Ref<MiniAppWebViewHandle>
}

/**
 * What the top bar shows when the page is no longer the app that was opened.
 * `url` is `null` for a site no listed app claims — there is no app URL to copy.
 */
interface PageApp {
  name: string
  url: string | null
  origin: string
}

export function MiniAppWebView({
  slug,
  path,
  onClose,
  showTopBar = true,
  ref,
}: MiniAppWebViewProps) {
  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:slug', {
    // A role mismatch is a question for the user, not a transport failure —
    // retrying it three times only delays the prompt.
    retry: (failureCount, error) => failureCount < 3 && roleMismatchFromError(error) === null,
  })

  // Set once the user answers the role prompt with เข้าใช้งาน: the exchange is
  // then re-run waiving the role check. Never set on their behalf.
  const [roleMismatchAcknowledged, setRoleMismatchAcknowledged] = useState(false)

  const { switchToPerson, isSwitching, eligiblePersons, activePersonId } =
    useSwitchToPerson(refreshMiniAppLists)

  const roleMismatch = roleMismatchFromError(tokenExchangeMiniAppResult.error)

  const { data: miniAppListData, isError: isMiniAppListError } = reactQueryClient.useQuery(
    '/mini-app',
    { query: {} }
  )
  const currentMiniApp = miniAppListData?.find((app) => app.slug === slug)

  const [canGoBack, setCanGoBack] = useState(false)
  const miniAppRef = useRef<WebView>(null)

  useImperativeHandle(
    ref,
    () => ({
      goBack: () => {
        if (!canGoBack || !miniAppRef.current) return false
        miniAppRef.current.goBack()
        return true
      },
    }),
    [canGoBack]
  )

  // Mini apps that do not require authentication are opened directly without
  // a token exchange, so logged-out users can use them and no tokens are
  // handed to public apps.
  const noAuthUrl = useMemo(() => {
    if (!currentMiniApp || currentMiniApp.requiresAuth) return null
    return miniAppUrlWithPath(currentMiniApp.url, path)
  }, [currentMiniApp, path])

  // The exchange runs once per request, not once per list fetch: the list is
  // refetched after a บทบาท switch, and re-running the exchange then would
  // reload the app the user is already in.
  const startedExchangeRef = useRef<string | null>(null)

  useEffect(() => {
    // On cold start params may hydrate a tick after mount; do nothing until
    // slug is available rather than bouncing to home on a transient empty value.
    if (!slug) return
    // Wait for the mini app list to know whether authentication is needed,
    // but fall back to the token exchange if the list cannot be fetched.
    if (!miniAppListData && !isMiniAppListError) return
    if (currentMiniApp && !currentMiniApp.requiresAuth) return

    const exchangeKey = JSON.stringify([slug, path, roleMismatchAcknowledged])
    if (startedExchangeRef.current === exchangeKey) return
    startedExchangeRef.current = exchangeKey

    tokenExchangeMiniAppResult.mutate({
      pathParams: { slug },
      query: {
        path,
        acknowledgeRoleMismatch: roleMismatchAcknowledged || undefined,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, path, miniAppListData, isMiniAppListError, roleMismatchAcknowledged])

  useEffect(() => {
    // A role mismatch has its own prompt; only genuine failures get the toast.
    if (tokenExchangeMiniAppResult.isError && !roleMismatch) {
      toast.error({ text1: 'เกิดข้อผิดพลาดในการยืนยันตัวตน', icon: TriangleAlertIcon })
    }
  }, [tokenExchangeMiniAppResult.isError, roleMismatch])

  // เข้าใช้งาน: switch บทบาท first when the user picked a different person, then
  // re-run the exchange. Waiving the role check is kept for the case where they
  // enter as they are — a switch that lands on a listed person needs no waiver,
  // but the flag costs nothing and covers a switch that does not.
  const enterWithPerson = async (personId: number | null) => {
    // The dialog stays up until the re-run exchange clears the error, so a
    // second tap in that gap must not switch บทบาท twice.
    if (isSwitching || roleMismatchAcknowledged) return
    if (!(await switchToPerson(personId))) return
    setRoleMismatchAcknowledged(true)
  }

  // The app that was opened, as the exchange (or failing that, the list)
  // describes it. The exchange's `baseUrl` is the registered URL without tokens.
  const openedApp = tokenExchangeMiniAppResult.data
  const openedAppName = openedApp?.appName ?? currentMiniApp?.name ?? ''
  const openedAppUrl = openedApp?.baseUrl ?? currentMiniApp?.url ?? null
  const openedAppOrigin = originOf(openedAppUrl)

  // `null` while the page is still on the opened app's origin. One app can
  // link to another inside the same WebView, and the bar should name the app
  // actually on screen — not the one the user tapped.
  const [pageApp, setPageApp] = useState<PageApp | null>(null)
  const currentPageUrlRef = useRef<string | null>(null)

  const bridge = useSessionBridge({
    webViewRef: miniAppRef,
    onResolved: (app: BridgeResolvedApp, origin: string) => {
      // An iframe on another origin can ask too; only the main frame's app
      // belongs in the bar.
      const pageOrigin = originOf(currentPageUrlRef.current)
      if (pageOrigin && pageOrigin !== origin) return
      setPageApp(
        origin === openedAppOrigin ? null : { name: app.appName, url: app.baseUrl, origin }
      )
    },
  })

  const { seedSession } = bridge
  useEffect(() => {
    // The opening exchange already minted a session for this app; a page that
    // asks the bridge for it straight away should not mint a second one.
    if (!openedApp?.session) return
    seedSession(
      openedApp.clientId,
      openedApp.baseUrl,
      { appName: openedApp.appName, baseUrl: openedApp.baseUrl },
      openedApp.session
    )
  }, [openedApp, seedSession])

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack)
    currentPageUrlRef.current = navState.url
    bridge.trackMainFrameUrl(navState.url)

    const origin = originOf(navState.url)
    // `about:blank` and friends between loads say nothing about which app is up.
    if (!origin) return
    if (origin === (pageApp?.origin ?? openedAppOrigin)) return
    if (origin === openedAppOrigin) {
      setPageApp(null)
      return
    }
    // A guess from the list until a bridge request names the app for sure;
    // a site no app claims shows its host name rather than a stale app name.
    const listed = findMiniAppForUrl(miniAppListData, navState.url)
    setPageApp(
      listed
        ? { name: listed.name, url: listed.url, origin }
        : { name: hostnameOf(navState.url) ?? '', url: null, origin }
    )
  }

  const shownAppName = pageApp ? pageApp.name : openedAppName
  const shownAppUrl = pageApp ? pageApp.url : openedAppUrl

  const userAgent = `PPLETodayApp/${Constants.expoConfig?.version ?? 'local'} MiniApp`

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      {showTopBar && (
        <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white flex-row items-center">
          {canGoBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              hitSlop={16}
              onPress={() => {
                if (miniAppRef.current) {
                  miniAppRef.current.goBack()
                }
              }}
              aria-label="Back to previous web page"
            >
              <Icon className="text-foreground" icon={ArrowLeftIcon} size={24} />
            </Button>
          ) : (
            <View className="size-6" />
          )}
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-1"
            disabled={!shownAppUrl}
            aria-label="Copy mini app URL"
            onPress={async () => {
              if (!shownAppUrl) return
              await Clipboard.setStringAsync(shownAppUrl)
              toast({
                text1: `คัดลอก URL ของแอปฯ "${shownAppName}" เรียบร้อย`,
              })
            }}
          >
            <Text className="text-center align-middle font-heading-bold">{shownAppName}</Text>
            {shownAppUrl ? <Icon className="text-foreground" icon={CopyIcon} size={14} /> : null}
          </Pressable>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            hitSlop={16}
            aria-label="Close mini app"
            onPress={onClose}
          >
            <Icon className="text-foreground" icon={XIcon} size={24} />
          </Button>
        </View>
      )}
      <View className="flex-1">
        {noAuthUrl ? (
          <WebView
            ref={miniAppRef}
            onNavigationStateChange={onNavigationStateChange}
            // Registering onMessage is what exposes window.ReactNativeWebView,
            // which tells the SDK this host speaks the session bridge. Public
            // apps get it too: they may link to an app that needs a session.
            onMessage={bridge.onMessage}
            userAgent={userAgent}
            source={{ uri: noAuthUrl }}
            startInLoadingState={true}
          />
        ) : (!miniAppListData && !isMiniAppListError) ||
          tokenExchangeMiniAppResult.isPending ||
          // The role prompt is a decision still in flight, not a dead end — the
          // app is behind it, so the screen keeps loading rather than flashing
          // "not found" underneath the dialog.
          !!roleMismatch ||
          isSwitching ? (
          <LoadingPage />
        ) : !tokenExchangeMiniAppResult.isSuccess ? (
          <NotFound />
        ) : (
          <WebView
            ref={miniAppRef}
            onNavigationStateChange={onNavigationStateChange}
            onMessage={bridge.onMessage}
            userAgent={userAgent}
            // The launch URL still carries the tokens in its query string, so
            // SDKs that predate the bridge keep working.
            source={{ uri: tokenExchangeMiniAppResult.data.url }}
            startInLoadingState={true}
          />
        )}
      </View>
      {roleMismatch ? (
        <MiniAppRoleGateDialog
          appName={roleMismatch.appName}
          requiredRoles={roleMismatch.requiredRoles}
          eligiblePersons={eligiblePersons}
          activePersonId={activePersonId}
          isSubmitting={isSwitching}
          onCancel={onClose}
          onConfirm={enterWithPerson}
        />
      ) : bridge.roleSwitchPrompt ? (
        // The page's own บทบาท switcher. It takes precedence over a role prompt
        // queued behind it, so two dialogs never stack.
        <MiniAppRoleSwitchDialog key={bridge.roleSwitchPrompt.id} {...bridge.roleSwitchPrompt} />
      ) : bridge.rolePrompt ? (
        // Asked by a page already on screen: cancel only declines that page's
        // request, it does not close the mini app.
        <MiniAppRoleGateDialog key={bridge.rolePrompt.id} {...bridge.rolePrompt} />
      ) : null}
    </View>
  )
}

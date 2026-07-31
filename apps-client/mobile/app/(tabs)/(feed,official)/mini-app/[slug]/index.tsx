import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, CopyIcon, TriangleAlertIcon, XIcon } from 'lucide-react-native'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { refreshMiniAppLists } from '@app/components/mini-app/invite-inbox'
import { MiniAppRoleGateDialog } from '@app/components/mini-app/role-gate-dialog'
import { reactQueryClient } from '@app/libs/api-client'
import { useActiveRole, useSwitchRoleMutation } from '@app/libs/auth'
import { toRoleValue } from '@app/utils/ad-role'
import { roleMismatchFromError } from '@app/utils/mini-app-role-gate'

const MiniAppWebView = () => {
  const router = useRouter()

  const params = useLocalSearchParams()
  const slug = params.slug as string
  const path = params.path as string | undefined

  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:slug', {
    // A role mismatch is a question for the user, not a transport failure —
    // retrying it three times only delays the prompt.
    retry: (failureCount, error) => failureCount < 3 && roleMismatchFromError(error) === null,
  })

  // Set once the user answers the role prompt with เข้าใช้งาน: the exchange is
  // then re-run waiving the role check. Never set on their behalf.
  const [roleMismatchAcknowledged, setRoleMismatchAcknowledged] = useState(false)

  const queryClient = useQueryClient()
  const activeRoleQuery = useActiveRole()
  const switchRoleMutation = useSwitchRoleMutation()

  const roleMismatch = roleMismatchFromError(tokenExchangeMiniAppResult.error)

  const { data: miniAppListData, isError: isMiniAppListError } = reactQueryClient.useQuery(
    '/mini-app',
    { query: {} }
  )
  const currentMiniApp = miniAppListData?.find((app) => app.slug === slug)

  const [canGoBack, setCanGoBack] = useState(false)
  const miniAppRef = useRef<WebView>(null)

  // Mini apps that do not require authentication are opened directly without
  // a token exchange, so logged-out users can use them and no tokens are
  // handed to public apps.
  const noAuthUrl = useMemo(() => {
    if (!currentMiniApp || currentMiniApp.requiresAuth) return null
    const url = new URL(currentMiniApp.url)
    if (path) url.pathname = path
    return url.toString()
  }, [currentMiniApp, path])

  useEffect(() => {
    // On cold start params may hydrate a tick after mount; do nothing until
    // slug is available rather than bouncing to home on a transient empty value.
    if (!slug) return
    // Wait for the mini app list to know whether authentication is needed,
    // but fall back to the token exchange if the list cannot be fetched.
    if (!miniAppListData && !isMiniAppListError) return
    if (currentMiniApp && !currentMiniApp.requiresAuth) return

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

  const closeMiniApp = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.dismissTo('/')
    }
  }

  // เข้าใช้งาน: switch บทบาท first when the user picked a different one, then
  // re-run the exchange. Waiving the role check is kept for the case where they
  // enter as they are — a switch that lands on a listed role needs no waiver,
  // but the flag costs nothing and covers a switch that does not.
  const enterWithRole = async (role: string | null) => {
    // The dialog stays up until the re-run exchange clears the error, so a
    // second tap in that gap must not switch บทบาท twice.
    if (switchRoleMutation.isPending || roleMismatchAcknowledged) return

    const activeRoleValue = activeRoleQuery.data?.activeRole
      ? toRoleValue(activeRoleQuery.data.activeRole)
      : null

    if (role && role !== activeRoleValue) {
      try {
        await switchRoleMutation.mutateAsync({ role })
      } catch {
        toast.error({ text1: 'เปลี่ยนบทบาทไม่สำเร็จ', icon: TriangleAlertIcon })
        return
      }
      // The app grid is role-scoped, and the user may have just switched into
      // the role this app is listed for — drop the list they came in with.
      await refreshMiniAppLists(queryClient)
    }

    setRoleMismatchAcknowledged(true)
  }

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
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
          disabled={!currentMiniApp}
          aria-label="Copy mini app URL"
          onPress={async () => {
            if (!currentMiniApp) return
            await Clipboard.setStringAsync(currentMiniApp.url)
            toast({
              text1: `คัดลอก URL ของแอปฯ "${currentMiniApp.name}" เรียบร้อย`,
            })
          }}
        >
          <Text className="text-center align-middle font-heading-bold">
            {tokenExchangeMiniAppResult.isSuccess
              ? tokenExchangeMiniAppResult.data.appName
              : (currentMiniApp?.name ?? '')}
          </Text>
          {currentMiniApp ? <Icon className="text-foreground" icon={CopyIcon} size={14} /> : null}
        </Pressable>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          hitSlop={16}
          aria-label="Close mini app"
          onPress={closeMiniApp}
        >
          <Icon className="text-foreground" icon={XIcon} size={24} />
        </Button>
      </View>
      <View className="flex-1">
        {noAuthUrl ? (
          <WebView
            ref={miniAppRef}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack)
            }}
            userAgent={`PPLETodayApp/${Constants.expoConfig?.version ?? 'local'} MiniApp`}
            source={{ uri: noAuthUrl }}
            startInLoadingState={true}
          />
        ) : (!miniAppListData && !isMiniAppListError) ||
          tokenExchangeMiniAppResult.isPending ||
          // The role prompt is a decision still in flight, not a dead end — the
          // app is behind it, so the screen keeps loading rather than flashing
          // "not found" underneath the dialog.
          !!roleMismatch ||
          switchRoleMutation.isPending ? (
          <LoadingPage />
        ) : !tokenExchangeMiniAppResult.isSuccess ? (
          <NotFound />
        ) : (
          <WebView
            ref={miniAppRef}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack)
            }}
            userAgent={`PPLETodayApp/${Constants.expoConfig?.version ?? 'local'} MiniApp`}
            source={{ uri: tokenExchangeMiniAppResult.data.url }}
            startInLoadingState={true}
          />
        )}
      </View>
      {roleMismatch && (
        <MiniAppRoleGateDialog
          appName={roleMismatch.appName}
          requiredRoles={roleMismatch.requiredRoles}
          eligibleRoles={activeRoleQuery.data?.eligibleRoles ?? []}
          activeRole={activeRoleQuery.data?.activeRole ?? null}
          isSubmitting={switchRoleMutation.isPending}
          onCancel={closeMiniApp}
          onConfirm={enterWithRole}
        />
      )}
    </View>
  )
}

export default MiniAppWebView

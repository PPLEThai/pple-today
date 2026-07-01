import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, CopyIcon, TriangleAlertIcon, XIcon } from 'lucide-react-native'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { reactQueryClient } from '@app/libs/api-client'

const MiniAppWebView = () => {
  const router = useRouter()

  const params = useLocalSearchParams()
  const slug = params.slug as string
  const path = params.path as string | undefined

  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:slug', {
    retry: 3,
  })

  const { data: miniAppListData } = reactQueryClient.useQuery('/mini-app', { query: {} })
  const currentMiniApp = miniAppListData?.find((app) => app.slug === slug)

  const [canGoBack, setCanGoBack] = useState(false)
  const miniAppRef = useRef<WebView>(null)

  useEffect(() => {
    // On cold start params may hydrate a tick after mount; do nothing until
    // slug is available rather than bouncing to home on a transient empty value.
    if (!slug) return

    tokenExchangeMiniAppResult.mutate({
      pathParams: { slug },
      query: {
        path,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, path])

  useEffect(() => {
    if (tokenExchangeMiniAppResult.isError) {
      toast.error({ text1: 'เกิดข้อผิดพลาดในการยืนยันตัวตน', icon: TriangleAlertIcon })
    }
  }, [tokenExchangeMiniAppResult.isError])

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
            {tokenExchangeMiniAppResult.isSuccess ? tokenExchangeMiniAppResult.data.appName : ''}
          </Text>
          {currentMiniApp ? <Icon className="text-foreground" icon={CopyIcon} size={14} /> : null}
        </Pressable>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          hitSlop={16}
          aria-label="Close mini app"
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.dismissTo('/')
            }
          }}
        >
          <Icon className="text-foreground" icon={XIcon} size={24} />
        </Button>
      </View>
      <View className="flex-1">
        {tokenExchangeMiniAppResult.isPending ? (
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
    </View>
  )
}

export default MiniAppWebView

import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, XIcon } from 'lucide-react-native'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { reactQueryClient } from '@app/libs/api-client'

const MiniAppWebView = () => {
  const router = useRouter()

  const params = useLocalSearchParams()
  const slug = params.slug as string
  const path = params.path as string | undefined

  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:slug')

  const [canGoBack, setCanGoBack] = useState(false)
  const miniAppRef = useRef<WebView>(null)

  useEffect(() => {
    if (!slug) {
      router.dismissTo('/')
      return
    }

    tokenExchangeMiniAppResult.mutateAsync({
      pathParams: { slug },
      query: {
        path,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, router])

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white flex-row items-center">
        {canGoBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
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
        <Text className="flex-1 text-center align-middle">
          {tokenExchangeMiniAppResult.isSuccess ? tokenExchangeMiniAppResult.data.appName : ''}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
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

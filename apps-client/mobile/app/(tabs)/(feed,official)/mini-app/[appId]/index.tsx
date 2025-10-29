import { useEffect } from 'react'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import NotFound from '@app/app/+not-found'
import LoadingPage from '@app/app/loading'
import { reactQueryClient } from '@app/libs/api-client'

const MiniAppWebView = () => {
  const router = useRouter()

  const params = useLocalSearchParams()
  const appId = params.appId as string
  const path = params.path as string | undefined
  const tokenExchangeMiniAppResult = reactQueryClient.useMutation('post', '/auth/mini-app/:appId')

  useEffect(() => {
    if (!appId) {
      router.dismissTo('/')
      return
    }

    tokenExchangeMiniAppResult.mutateAsync({
      pathParams: { appId },
      query: {
        path,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, router])

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <View className="flex-1">
        {tokenExchangeMiniAppResult.isPending ? (
          <LoadingPage />
        ) : !tokenExchangeMiniAppResult.isSuccess ? (
          <NotFound />
        ) : (
          <WebView
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

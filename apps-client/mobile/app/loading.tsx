import { useEffect } from 'react'
import { BackHandler, View } from 'react-native'

import { useNavigation } from 'expo-router'

import { Spinner } from '@app/components/spinner'

export default function LoadingPage() {
  const navigation = useNavigation()

  useEffect(() => {
    // block back button on android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true
    })
    return () => backHandler.remove()
  }, [navigation])
  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <Spinner />
    </View>
  )
}

import { useEffect } from 'react'
import { View } from 'react-native'

import { useNavigation } from 'expo-router'

import { Spinner } from '@app/components/spinner'

export default function LoadingPage() {
  const navigation = useNavigation()

  useEffect(() => {
    // block back button navigation
    const listener = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault()
    })
    return () => {
      navigation.removeListener('beforeRemove', listener)
    }
  }, [navigation])
  return (
    <View className="flex-1 flex flex-col items-center justify-center pointer-events-none">
      <Spinner />
    </View>
  )
}

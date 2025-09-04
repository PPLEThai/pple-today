import { View } from 'react-native'

import { Slot } from 'expo-router'

import { OnboardingProvider } from '@app/components/onboarding/onboarding-context'

export default function OnboardingLayout() {
  return (
    <View className="flex-1 p-safe">
      <OnboardingProvider>
        <Slot />
      </OnboardingProvider>
    </View>
  )
}

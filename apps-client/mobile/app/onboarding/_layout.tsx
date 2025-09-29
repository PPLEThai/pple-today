import { View } from 'react-native'

import { Slot } from 'expo-router'

import { OnboardingProvider } from '@app/components/onboarding/onboarding-context'

export default function OnboardingLayout() {
  return (
    <View className="p-safe flex-1">
      <OnboardingProvider>
        <Slot />
      </OnboardingProvider>
    </View>
  )
}

import { SafeAreaView } from 'react-native-safe-area-context'

import { Slot } from 'expo-router'

import { OnboardingProvider } from '@app/components/onboarding/onboarding-context'

export default function OnboardingLayout() {
  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
      <OnboardingProvider>
        <Slot />
      </OnboardingProvider>
    </SafeAreaView>
  )
}

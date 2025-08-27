import { SafeAreaView } from 'react-native-safe-area-context'
import { OnboardingProvider } from '@app/components/onboarding/onboarding-context'

import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
      <OnboardingProvider>
        <Stack
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            animation: 'simple_push',
            animationDuration: 300,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </OnboardingProvider>
    </SafeAreaView>
  )
}

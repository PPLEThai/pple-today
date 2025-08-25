import React from 'react'
import { View } from 'react-native'

import { OnboardingAddress } from '@app/components/onboarding/onboarding-address'
import { OnboardingContainer } from '@app/components/onboarding/onboarding-container'
import { OnboardingProfile } from '@app/components/onboarding/onboarding-profile'
import { OnboardingTopic } from '@app/components/onboarding/onboarding-topic'
import { OnboardingContext, OnboardingInitialState, OnboardingReducer } from '@app/libs/onboarding'

export default function Index() {
  const [state, dispatch] = React.useReducer(OnboardingReducer, { ...OnboardingInitialState })

  return (
    <View className="w-full rounded-2xl flex flex-col gap-3 px-6 pb-6 ">
      <OnboardingContext.Provider value={{ state, dispatch }}>
        <OnboardingContainer>
          {state.activeStep === 'profile' && <OnboardingProfile />}
          {state.activeStep === 'topic' && <OnboardingTopic />}
          {state.activeStep === 'address' && <OnboardingAddress />}
        </OnboardingContainer>
      </OnboardingContext.Provider>
    </View>
  )
}

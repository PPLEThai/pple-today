import { OnboardingAddress } from '@app/components/onboarding/onboarding-address'
import { OnboardingContainer } from '@app/components/onboarding/onboarding-container'
import {
  OnboardingProvider,
  useOnboardingContext,
} from '@app/components/onboarding/onboarding-context'
import { OnboardingProfile } from '@app/components/onboarding/onboarding-profile'
import { OnboardingTopic } from '@app/components/onboarding/onboarding-topic'

export default function Index() {
  const { state } = useOnboardingContext()

  return (
    <OnboardingProvider>
      <OnboardingContainer>
        {state.activeStep === 'profile' && <OnboardingProfile />}
        {state.activeStep === 'topic' && <OnboardingTopic />}
        {state.activeStep === 'address' && <OnboardingAddress />}
      </OnboardingContainer>
    </OnboardingProvider>
  )
}

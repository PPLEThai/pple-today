import { OnboardingAddress } from '@app/components/onboarding/onboarding-address'
import { OnboardingContainer } from '@app/components/onboarding/onboarding-container'
import { useOnboardingContext } from '@app/contexts/onboarding-context'
import { OnboardingProfile } from '@app/components/onboarding/onboarding-profile'
import { OnboardingTopic } from '@app/components/onboarding/onboarding-topic'

export default function Index() {
  const { state } = useOnboardingContext()

  return (
    <OnboardingContainer>
      {state.activeStep === 'profile' && <OnboardingProfile />}
      {state.activeStep === 'topic' && <OnboardingTopic />}
      {state.activeStep === 'address' && <OnboardingAddress />}
    </OnboardingContainer>
  )
}

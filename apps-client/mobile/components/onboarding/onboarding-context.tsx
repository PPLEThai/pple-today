import React from 'react'

// reference: https://github.com/bluesky-social/social-app/blob/main/src/screens/Onboarding/state.ts

export type OnboardingState = {
  hasPrev: boolean
  totalSteps: number
  activeStep: 'profile' | 'topic' | 'address'
  activeStepIndex: number

  profileStepResult: OnboardingProfileState
  topicStepResult: OnboardingTopicState
  addressStepResult: OnboardingAddressState
}

export type OnboardingProfileState = {
  name: string
  image?: {
    path: string
    mime: string
    size: number
    width: number
    height: number
  }
  imageUri?: string
  imageMime?: string
}

export type OnboardingTopicState = {
  topics: string[]
}

export type OnboardingAddressState = {
  province: string
  district: string
  subdistrict: string
  postalCode: string
}

export const OnboardingInitialState: OnboardingState = {
  hasPrev: false,
  totalSteps: 3,
  activeStep: 'profile',
  activeStepIndex: 1, // start from 1
  profileStepResult: {
    name: '',
    image: undefined,
    imageUri: '',
    imageMime: '',
  },
  topicStepResult: {
    topics: [],
  },
  addressStepResult: {
    province: '',
    district: '',
    subdistrict: '',
    postalCode: '',
  },
}

export type OnboardingAction =
  | {
      type: 'next'
    }
  | {
      type: 'prev'
    }
  | {
      type: 'address'
    }
  | {
      type: 'setProfileStepResults'
      name: string
      image: OnboardingState['profileStepResult']['image'] | undefined
      imageUri: string | undefined
      imageMime: string
    }
  | {
      type: 'setTopicStepResults'
      payload: OnboardingTopicState
    }
  | {
      type: 'setAddressStepResults'
      payload: OnboardingAddressState
    }

interface OnboardingContextValue {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
}

export const OnboardingContext = React.createContext<OnboardingContextValue | null>(null)

export function useOnboardingContext() {
  const context = React.useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider')
  }
  return context
}

interface OnboardingProviderProps {
  children: React.ReactNode
}

export function OnboardingProvider(props: OnboardingProviderProps) {
  const [state, dispatch] = React.useReducer(OnboardingReducer, OnboardingInitialState)

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {props.children}
    </OnboardingContext.Provider>
  )
}

export function OnboardingReducer(s: OnboardingState, a: OnboardingAction): OnboardingState {
  const next = { ...s }

  switch (a.type) {
    case 'next': {
      if (s.activeStep === 'profile') {
        next.activeStep = 'topic'
        next.activeStepIndex = 2
      } else if (s.activeStep === 'topic') {
        next.activeStep = 'address'
        next.activeStepIndex = 3
      }
      break
    }
    case 'prev': {
      if (s.activeStep === 'topic') {
        next.activeStep = 'profile'
        next.activeStepIndex = 1
      } else if (s.activeStep === 'address') {
        next.activeStep = 'topic'
        next.activeStepIndex = 2
      }
      break
    }
    case 'setProfileStepResults': {
      next.profileStepResult = {
        name: a.name,
        image: a.image,
        imageUri: a.imageUri,
        imageMime: a.imageMime,
      }
      break
    }
    case 'setTopicStepResults': {
      next.topicStepResult = {
        topics: a.payload.topics,
      }
      break
    }
    case 'setAddressStepResults': {
      next.addressStepResult = {
        province: a.payload.province,
        district: a.payload.district,
        subdistrict: a.payload.subdistrict,
        postalCode: a.payload.postalCode,
      }
      break
    }
    default:
      break
  }

  const state = {
    ...next,
    hasPrev: next.activeStep !== 'profile',
  }

  return state
}

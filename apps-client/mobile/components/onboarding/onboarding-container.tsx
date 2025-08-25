import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { ArrowLeftIcon } from 'lucide-react-native'

import { OnboardingContext } from '@app/libs/onboarding'

export function OnboardingContainer({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = React.useContext(OnboardingContext)

  return (
    <View className="size-full flex flex-col">
      <OnboardingContext.Provider value={{ state, dispatch }}>
        <View>
          <View className="flex flex-row items-center gap-4">
            <Button
              variant="ghost"
              className="gap-0"
              onPress={() => dispatch({ type: 'prev' })}
              disabled={!state.hasPrev}
            >
              <Icon
                icon={ArrowLeftIcon}
                size={24}
                strokeWidth={1}
                className="text-base-text-high"
              />
            </Button>
            <Progress value={34 * state.activeStepIndex} max={100} className="flex-1" />
            <Text className="text-base-text-medium">
              {state.activeStepIndex}/{state.totalSteps}
            </Text>
          </View>
          <View>
            <OnboardingHeader step={state.activeStepIndex} />
          </View>
        </View>
        {children}
      </OnboardingContext.Provider>
    </View>
  )
}

function OnboardingHeader({ step }: { step: number }) {
  const getHeaderContent = () => {
    switch (step) {
      case 2:
        return {
          title: 'เลือกหัวข้อที่สนใจ',
          description: 'เลือกอย่างน้อย 3 หัวข้อก่อนดำเนินการต่อ',
        }
      case 3:
        return {
          title: 'ข้อมูลที่อยู่',
          description: 'กรอกที่อยู่ เพื่อให้เราแนะนำข่าวสารที่ตรงกับพื้นที่ และความสนใจของคุณ',
        }
      default:
        return {
          title: 'ตั้งค่าโปรไฟล์',
          description: 'ตั้งค่าโปรไฟล์ที่ต้องการให้แสดง',
        }
    }
  }

  const { title, description } = getHeaderContent()

  return (
    <View className="flex flex-col py-4">
      <H2 className="text-base-primary-default pt-3 font-anakotmai-medium">{title}</H2>
      <Text className="font-anakotmai-medium text-base-text-medium">{description}</Text>
    </View>
  )
}

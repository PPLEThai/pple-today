import React from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { ToggleGroup, ToggleGroupItem } from '@pple-today/ui/toggle-group'

import { useOnboardingContext } from './onboarding-context'

const mockTopics = [
  'การเมือง',
  'สส',
  'ไฟฟ่า',
  'สว',
  'เลือกตั้งนายก',
  'อองค์กลิ่งกาย',
  'โควิด',
  'ลดบะ',
  'PM2.5',
  'เลือกตั้ง อบจ.',
  'น้ำท่วม',
  'อาสาสมัคร',
  'สมรสเท่าเทียม',
  'กิจกรรม',
  'การเมือง',
  'สส',
  'ไฟฟ่า',
  'สว',
  'เลือกตั้งนายก',
  'อองค์กลิ่งกาย',
  'โควิด',
  'ลดบะ',
  'PM2.5',
  'เลือกตั้ง อบจ.',
  'น้ำท่วม',
  'อาสาสมัคร',
  'สมรสเท่าเทียม',
  'กิจกรรม',
  'การเมือง',
  'สส',
  'ไฟฟ่า',
  'สว',
  'เลือกตั้งนายก',
  'อองค์กลิ่งกาย',
  'โควิด',
  'ลดบะ',
  'PM2.5',
  'เลือกตั้ง อบจ.',
  'น้ำท่วม',
  'อาสาสมัคร',
  'สมรสเท่าเทียม',
  'กิจกรรม',
  'การเมือง',
  'สส',
  'ไฟฟ่า',
  'สว',
  'เลือกตั้งนายก',
  'อองค์กลิ่งกาย',
  'โควิด',
  'ลดบะ',
  'PM2.5',
  'เลือกตั้ง อบจ.',
  'น้ำท่วม',
  'อาสาสมัคร',
  'สมรสเท่าเทียม',
  'กิจกรรม',
  'การเมือง',
  'สส',
  'ไฟฟ่า',
  'สว',
  'เลือกตั้งนายก',
  'อองค์กลิ่งกาย',
  'โควิด',
  'ลดบะ',
  'PM2.5',
  'เลือกตั้ง อบจ.',
  'น้ำท่วม',
  'อาสาสมัคร',
  'สมรสเท่าเทียม',
  'กิจกรรม',
]

export function OnboardingTopic() {
  const { dispatch } = useOnboardingContext()
  const [value, setValue] = React.useState<string[]>([mockTopics[0]])

  const handleNext = React.useCallback(() => {
    dispatch({ type: 'next' })
  }, [dispatch])

  const handleSkip = React.useCallback(() => {
    dispatch({ type: 'next' })
  }, [dispatch])

  return (
    <View className="flex-1 justify-between">
      <ScrollView>
        <ToggleGroup
          type="multiple"
          value={value}
          onValueChange={setValue}
          className="flex flex-row gap-2 flex-wrap justify-start"
        >
          {mockTopics.map((tag, index) => (
            <ToggleGroupItem key={'topic_' + index} value={tag} variant="outline">
              <Text>{tag}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ScrollView>
      <View className="gap-2 pb-6 pt-4">
        <Button onPress={handleNext}>
          <Text>ถัดไป</Text>
        </Button>
        <Button variant="ghost" onPress={handleSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}

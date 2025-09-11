import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
import { Input } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { useForm } from '@tanstack/react-form'
import * as ImagePicker from 'expo-image-picker'
import { z } from 'zod/v4'

import { ProfileSelect } from '@app/components/profile/profile-select'
import { reactQueryClient } from '@app/libs/api-client'

import { useOnboardingContext } from '../../contexts/onboarding-context'

const formSchema = z.object({
  name: z.string(),
  profileImage: z.string(),
})

export function OnboardingProfile() {
  const { state, dispatch } = useOnboardingContext()
  const [imagePickerRes, setImagePickerRes] = React.useState<
    ImagePicker.ImagePickerSuccessResult | undefined
  >(state.profileStepResult?.imagePickerResult)

  const profileQuery = reactQueryClient.useQuery('/profile/me', {})

  const form = useForm({
    defaultValues: {
      name: state.profileStepResult?.name ?? profileQuery.data?.name ?? '',
      profileImage: imagePickerRes?.assets[0]?.uri ?? '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      const profilePayload = {
        name: values.value.name,
        imagePickerResult: imagePickerRes,
      }

      dispatch({
        type: 'setProfileStepResults',
        payload: profilePayload,
      })
      dispatch({ type: 'next' })
    },
  })

  const handleNext = React.useCallback(() => {
    form.handleSubmit()
  }, [form])

  const handleSkip = React.useCallback(() => {
    dispatch({ type: 'skip' })
  }, [dispatch])

  return (
    <>
      <View className="flex-1 items-center p-6 gap-10">
        <form.Field name="profileImage">
          {(field) => (
            <FormItem field={field}>
              <FormControl>
                <ProfileSelect
                  imagePickerResult={imagePickerRes}
                  onChangeImagePickerResult={setImagePickerRes}
                />
              </FormControl>
            </FormItem>
          )}
        </form.Field>
        <View className="w-full">
          <form.Field name="name">
            {(field) => (
              <FormItem field={field}>
                <FormLabel>ชื่อที่แสดง</FormLabel>
                <FormControl>
                  <Input
                    placeholder="กรอกชื่อที่ต้องการให้แสดง"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                  />
                </FormControl>
              </FormItem>
            )}
          </form.Field>
        </View>
      </View>
      <View className="gap-2 px-6 pb-6">
        <form.Subscribe selector={(state) => [state.values.name]}>
          {([name]) => (
            <Button disabled={!name} onPress={handleNext}>
              <Text>ถัดไป</Text>
            </Button>
          )}
        </form.Subscribe>
        <Button variant="ghost" onPress={handleSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </>
  )
}

import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
import { Input } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { useForm } from '@tanstack/react-form'
import * as ImagePicker from 'expo-image-picker'
import { z } from 'zod/v4'

import { AvatarImagePicker } from '@app/components/avatar-imagepicker'
import { reactQueryClient } from '@app/libs/api-client'

import { useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  name: z.string(),
  profileImage: z.string(),
})

export function OnboardingProfile() {
  const { state, dispatch } = useOnboardingContext()
  const [imagePickerAsset, setImagePickerAsset] = React.useState<
    ImagePicker.ImagePickerAsset | undefined
  >(state.profileStepResult?.imagePickerAsset)

  const profileQuery = reactQueryClient.useQuery('/profile/me', {})

  const form = useForm({
    defaultValues: {
      name: state.profileStepResult?.name ?? profileQuery.data?.name ?? '',
      profileImage: imagePickerAsset?.uri ?? '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      const profilePayload = {
        name: values.value.name,
        imagePickerAsset: imagePickerAsset,
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
                <AvatarImagePicker
                  imagePickerAsset={imagePickerAsset}
                  onChangeImagePickerAsset={setImagePickerAsset}
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

import React from 'react'
import { View } from 'react-native'

import { Avatar, AvatarFallback, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { useForm, useStore } from '@tanstack/react-form'
import * as ImagePicker from 'expo-image-picker'
import { Pencil } from 'lucide-react-native'
import { z } from 'zod/v4'

import { usePhotoLibraryPermission } from '@app/libs/use-permission'

import { OnboardingProfileState, useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  name: z.string(),
  profileSignedImage: z.string(),
})

export function OnboardingProfile() {
  const { state, dispatch } = useOnboardingContext()
  const [selectedImage, setSelectedImage] = React.useState<OnboardingProfileState['image'] | null>(
    state.profileStepResult?.image ?? null
  )
  const { requestPhotoAccessIfNeeded } = usePhotoLibraryPermission()

  const form = useForm({
    defaultValues: {
      name: state.profileStepResult?.name ?? '',
      profileSignedImage: state.profileStepResult?.imageUri ?? '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values.value)

      if (!selectedImage) {
        // alert
        return
      }

      const profilePayload = {
        name: values.value.name,
        image: selectedImage,
        imageUri: '', // get signed image here
        imageMime: '', // get signed image mime here
      }

      dispatch({
        type: 'setProfileStepResults',
        payload: profilePayload,
      })
      dispatch({ type: 'next' })
    },
  })

  const canContinue = useStore(form.store, (state) => state.values.name)

  const handleNext = React.useCallback(() => {
    form.handleSubmit()
  }, [form])

  const handleSkip = React.useCallback(() => {
    dispatch({ type: 'next' })
  }, [dispatch])

  const pickImageAsync = React.useCallback(async () => {
    const hasPermission = await requestPhotoAccessIfNeeded()
    if (!hasPermission) {
      alert('Permission to access media library is required!')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    })

    if (result.canceled) {
      console.log('ImagePicker: cancelled ...')
      return
    }

    const imageObj = {
      path: result.assets[0].uri,
      mime: 'image',
      size: result.assets[0].fileSize || 0,
      width: result.assets[0].width,
      height: result.assets[0].height,
    }

    console.log(result.assets[0].mimeType)

    setSelectedImage(imageObj)
  }, [requestPhotoAccessIfNeeded])

  return (
    <>
      <View className="flex-1 items-center p-6 gap-10">
        <form.Field name="profileSignedImage">
          {(field) => (
            <FormItem field={field}>
              <FormControl>
                <Button
                  variant="ghost"
                  className="relative size-fit p-0 rounded-full"
                  onPress={pickImageAsync}
                >
                  <Avatar className="size-36" alt="Profile">
                    <AvatarImage
                      source={{
                        uri: selectedImage?.path,
                      }}
                    />
                    <AvatarFallback>
                      <View />
                    </AvatarFallback>
                  </Avatar>
                  <View className="absolute bottom-0 right-0">
                    <View className="bg-base-primary-default rounded-full border-2 size-fit border-background p-2">
                      <Icon icon={Pencil} size={20} className="text-white" />
                    </View>
                  </View>
                </Button>
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
        <Button disabled={!canContinue} onPress={handleNext}>
          <Text>ถัดไป</Text>
        </Button>
        <Button variant="ghost" onPress={handleSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </>
  )
}

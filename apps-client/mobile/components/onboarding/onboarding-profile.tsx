import React from 'react'
import { View } from 'react-native'

import { Avatar, AvatarFallback, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { useForm } from '@tanstack/react-form'
import * as ImagePicker from 'expo-image-picker'
import { Pencil } from 'lucide-react-native'
import { z } from 'zod/v4'

import { usePhotoLibraryPermission } from '@app/libs/use-permission'

import { useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  name: z.string(),
  profileImage: z.string(),
})

export function OnboardingProfile() {
  const { state, dispatch } = useOnboardingContext()
  const [selectedImage, setSelectedImage] = React.useState<string | null>(
    state.profileStepResult?.imagePickerResult?.assets[0].uri ?? null
  )
  const [imagePickerRes, setImagePickerRes] = React.useState<
    ImagePicker.ImagePickerSuccessResult | undefined
  >(undefined)
  const { requestPhotoAccessIfNeeded } = usePhotoLibraryPermission()

  const form = useForm({
    defaultValues: {
      name: state.profileStepResult?.name ?? '',
      profileImage: selectedImage ?? '',
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
      base64: true,
    })
    if (result.canceled) {
      return
    }

    const selectedFromMedia = result.assets[0]
    const imageObj = {
      path: selectedFromMedia.uri,
      mime: selectedFromMedia.mimeType || 'image/unknown',
      size: selectedFromMedia.fileSize || 0,
      width: selectedFromMedia.width,
      height: selectedFromMedia.height,
    }

    // 5 MB image
    // validation process
    const minimumImageSize = 0
    const maximumImageSize = 5242880
    if (imageObj.size > maximumImageSize) {
      alert('Image size must be less than 5 MB')
      return
    }
    if (imageObj.size <= minimumImageSize) {
      alert('Image size must be greater than 0 bytes')
      return
    }
    if (imageObj.mime !== 'image/jpeg' && imageObj.mime !== 'image/png') {
      alert('Image must be in JPEG or PNG format')
      return
    }

    setSelectedImage(imageObj.path)
    setImagePickerRes(result)
  }, [requestPhotoAccessIfNeeded])

  return (
    <>
      <View className="flex-1 items-center p-6 gap-10">
        <form.Field name="profileImage">
          {(field) => (
            <FormItem field={field}>
              <FormControl>
                <Button
                  variant="ghost"
                  className="relative size-fit p-0 rounded-full"
                  onPress={pickImageAsync}
                >
                  <Avatar className="size-36" alt="Profile">
                    <AvatarImage source={{ uri: selectedImage ?? '' }} />
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

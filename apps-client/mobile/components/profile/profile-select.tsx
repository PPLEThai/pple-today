import React from 'react'
import { Pressable, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Icon } from '@pple-today/ui/icon'
import { ImagePickerSuccessResult, launchImageLibraryAsync } from 'expo-image-picker'
import { Pencil } from 'lucide-react-native'

import { usePhotoLibraryPermission } from '@app/libs/use-permission'

import { AvatarPPLEFallback } from '../avatar-pple-fallback'

interface ProfileSelectProps {
  originalImage?: string
  imagePickerResult?: ImagePickerSuccessResult
  onChangeImagePickerResult: (imagePickerSuccessResult: ImagePickerSuccessResult) => void
}

export function ProfileSelect({
  originalImage,
  imagePickerResult,
  onChangeImagePickerResult,
}: ProfileSelectProps) {
  const { requestPhotoAccessIfNeeded } = usePhotoLibraryPermission()

  const pickImageAsync = React.useCallback(async () => {
    const hasPermission = await requestPhotoAccessIfNeeded()
    if (!hasPermission) {
      alert('Permission to access media library is required!')
      return
    }
    const result = await launchImageLibraryAsync({
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

    onChangeImagePickerResult(result)
  }, [requestPhotoAccessIfNeeded, onChangeImagePickerResult])

  return (
    <View className="items-center">
      <Pressable className="rounded-full" onPress={pickImageAsync}>
        <Avatar className="size-36" alt="Profile">
          <AvatarImage source={{ uri: imagePickerResult?.assets[0]?.uri ?? originalImage }} />
          <AvatarPPLEFallback />
        </Avatar>
        <View className="absolute bottom-0 right-0">
          <View className="bg-base-primary-default rounded-full border-2 size-fit border-background p-2">
            <Icon icon={Pencil} size={20} className="text-white" />
          </View>
        </View>
      </Pressable>
    </View>
  )
}

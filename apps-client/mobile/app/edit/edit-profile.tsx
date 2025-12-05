import React from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Input } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { ImagePickerAsset } from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { CircleUserRoundIcon, TriangleAlertIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { useEditingContext } from '@app/app/edit/_layout'
import { AddressCard } from '@app/components/address-card'
import { AvatarImagePicker } from '@app/components/avatar-imagepicker'
import { Header } from '@app/components/header-navigation'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { getAuthSessionAsync } from '@app/libs/auth/session'
import { ImageMimeType } from '@app/types/file'
import { handleUploadImage } from '@app/utils/upload'

const formSchema = z.object({
  name: z.string().min(1, 'กรุณาใส่ชื่อของคุณ'),
  profileImagePath: z.string(),
})

export default function EditProfilePage() {
  const { state, dispatch } = useEditingContext()
  const [imagePickerAsset, setImagePickerAsset] = React.useState<ImagePickerAsset | undefined>(
    undefined
  )

  const router = useRouter()
  const queryClient = useQueryClient()
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  const updateProfileMutation = reactQueryClient.useMutation('patch', '/profile/me')

  const form = useForm({
    defaultValues: {
      name: profileQuery.data?.name,
      profileImagePath: profileQuery.data?.profileImage || '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const updateProfilePayload: Record<string, any> = {}

      // Handle image update
      if (imagePickerAsset) {
        try {
          const session = await getAuthSessionAsync()
          if (!session) {
            throw new Error('No auth session found')
          }

          const { data: getLink } = await fetchClient('/profile/upload-url', {
            method: 'POST',
            body: {
              contentType: (imagePickerAsset.mimeType || 'image/png') as ImageMimeType,
            },
            headers: {},
          })

          if (!getLink || !getLink.uploadUrl || !getLink.uploadFields) {
            throw new Error('Invalid upload URL response')
          }

          await handleUploadImage(imagePickerAsset, getLink.uploadUrl, getLink.uploadFields)
          updateProfilePayload.profileImagePath = getLink.fileKey
        } catch (error) {
          console.error('Image upload failed:', error)
          throw error
        }
      }

      // Handle name update
      if (value.name?.trim()) {
        updateProfilePayload.name = value.name.trim()
      }

      // Handle address update
      if (state.addressStepResult) {
        updateProfilePayload.address = state.addressStepResult
      }

      // If no changes, do nothing
      if (Object.keys(updateProfilePayload).length === 0) {
        return
      }

      updateProfileMutation.mutateAsync(
        {
          body: updateProfilePayload,
        },
        {
          onSuccess: () => {
            toast({ text1: 'บันทึกโปรไฟล์เรียบร้อย' })
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/profile/me'),
            })
            dispatch({ type: 'reset' })
            router.replace('/profile')
          },
          onError: () => {
            toast.error({ text1: 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์', icon: TriangleAlertIcon })
          },
        }
      )
    },
  })

  return (
    <>
      <Header
        icon={CircleUserRoundIcon}
        title="แก้ไขโปรไฟล์"
        onBack={() => dispatch({ type: 'reset' })}
      />
      <ScrollView className="p-4">
        <View className="py-6 gap-10">
          <form.Field name="profileImagePath">
            {(field) => (
              <FormItem field={field}>
                <FormControl>
                  <AvatarImagePicker
                    originalImage={field.state.value}
                    imagePickerAsset={imagePickerAsset}
                    onChangeImagePickerAsset={setImagePickerAsset}
                  />
                </FormControl>
              </FormItem>
            )}
          </form.Field>
          <form.Field name="name">
            {(field) => (
              <FormItem field={field} className="px-2">
                <FormLabel>ชื่อที่แสดง</FormLabel>
                <FormControl>
                  <Input
                    placeholder="กรอกชื่อที่ต้องการให้แสดง"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          </form.Field>
        </View>
        <AddressCard
          address={state.addressStepResult || profileQuery.data?.address || null}
          handleOpenForm={() => {
            router.push('/edit/edit-address')
          }}
        />
      </ScrollView>
      <View className="p-6 pt-4 fixed bottom-0 bg-base-bg-white w-full">
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button onPress={form.handleSubmit} disabled={isSubmitting}>
              <Text>บันทึก</Text>
            </Button>
          )}
        </form.Subscribe>
      </View>
    </>
  )
}

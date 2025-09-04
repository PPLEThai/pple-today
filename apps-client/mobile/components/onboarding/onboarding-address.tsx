import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import {
  NativeSelectScrollView,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@pple-today/ui/select'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { useForm, useStore } from '@tanstack/react-form'
import { ImagePickerSuccessResult } from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { MessageCircleIcon, Pencil, PlusIcon, TriangleAlertIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { getAuthSession } from '@app/libs/auth/session'
import { handleUploadSignedUrl } from '@app/utils/upload'

import { OnboardingAddressState, useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกอำเภอ'),
  subDistrict: z.string().min(1, 'กรุณาเลือกตำบล'),
  postalCode: z.string().min(1, 'กรุณาเลือกรหัสไปรษณีย์'),
})

export function OnboardingAddress() {
  const { state, dispatch } = useOnboardingContext()
  const [address, setAddress] = React.useState<OnboardingAddressState | null>(
    state.addressStepResult
  )
  const [openForm, setOpenForm] = React.useState(false)

  const getProvinceQuery = reactQueryClient.useQuery('/address/province', {})

  const form = useForm({
    defaultValues: {
      province: address?.province,
      district: address?.district,
      subDistrict: address?.subDistrict,
      postalCode: address?.postalCode,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      const _province = values.value.province
      const _district = values.value.district
      const _subDistrict = values.value.subDistrict
      const _postalCode = values.value.postalCode

      if (!_province || !_district || !_subDistrict || !_postalCode) return

      const addressPayload = {
        province: _province,
        district: _district,
        subDistrict: _subDistrict,
        postalCode: _postalCode,
      }
      dispatch({
        type: 'setAddressStepResults',
        payload: addressPayload,
      })
      setAddress(addressPayload)
      setOpenForm(false)
    },
  })

  React.useEffect(() => {
    if (address) {
      form.setFieldValue('province', address.province)
      form.setFieldValue('district', address.district)
      form.setFieldValue('subDistrict', address.subDistrict)
      form.setFieldValue('postalCode', address.postalCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provinceValues = useStore(form.store, (state) => state.values.province)
  const districtValues = useStore(form.store, (state) => state.values.district)
  const subdistrictValues = useStore(form.store, (state) => state.values.subDistrict)

  const getDistrictQuery = reactQueryClient.useQuery(
    '/address/district',
    { query: { province: provinceValues } },
    { enabled: !!provinceValues }
  )
  const getSubdistrictQuery = reactQueryClient.useQuery(
    '/address/subdistrict',
    { query: { province: provinceValues, district: districtValues } },
    { enabled: !!districtValues }
  )
  const getPostalCodeQuery = reactQueryClient.useQuery(
    '/address/postal-code',
    {
      query: { province: provinceValues, district: districtValues, subDistrict: subdistrictValues },
    },
    { enabled: !!subdistrictValues }
  )

  const router = useRouter()

  const handleSkip = React.useCallback(() => {
    router.navigate('/')
  }, [router])

  const handleOpenForm = React.useCallback(() => {
    setOpenForm(true)
  }, [])

  const handleOnSubmit = React.useCallback(() => {
    form.handleSubmit()
  }, [form])
  const completeOnboardingMutation = reactQueryClient.useMutation('post', '/profile/on-boarding')

  const handleUploadProfileImageFile = async (
    imgPickerResult: ImagePickerSuccessResult,
    uploadUrl: string,
    uploadFields: Record<string, string>
  ) => {
    // create blob to upload
    const asset = imgPickerResult.assets[0]
    if (!asset) return
    try {
      const formData = new FormData()

      for (const [key, value] of Object.entries(uploadFields)) {
        formData.append(key, value)
      }

      // @ts-expect-error: Special react native format for form data
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `profile-picture-${new Date().getTime()}.png`,
        type: asset.mimeType,
      })

      const result = await handleUploadSignedUrl(uploadUrl, formData)

      if (!result.ok) {
        throw new Error('Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image', err)
      throw err
    }
  }

  const handleEndOnboarding = React.useCallback(async () => {
    const addressPayload = {
      province: state.addressStepResult?.province ?? '',
      district: state.addressStepResult?.district ?? '',
      subDistrict: state.addressStepResult?.subDistrict ?? '',
      postalCode: state.addressStepResult?.postalCode ?? '',
    }
    const interestedTopicPayload = state.topicStepResult?.topics

    let profilePayload
    if (state.profileStepResult?.imagePickerResult) {
      const session = await getAuthSession()
      if (!session) {
        throw new Error('No auth session found')
      }

      const result = await fetchClient('/profile/upload-url', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
      if (!result || !result.data) {
        throw new Error('Cannot get upload url')
      }

      await handleUploadProfileImageFile(
        state.profileStepResult.imagePickerResult,
        result.data.uploadUrl,
        result.data.uploadFields
      )
      profilePayload = {
        name: state.profileStepResult?.name ?? '',
        profileImage: result.data.fileKey ?? '',
      }
    } else {
      profilePayload = {
        name: state.profileStepResult?.name ?? '',
      }
    }

    completeOnboardingMutation.mutateAsync(
      {
        body: {
          address: addressPayload ? addressPayload : undefined,
          interestTopics: interestedTopicPayload ? interestedTopicPayload : undefined,
          profile: profilePayload ? profilePayload : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            text1: 'ระบบบันทึกข้อมูลของคุณเรียบร้อย',
            icon: MessageCircleIcon,
          })
          router.navigate('/')
        },
        onError: () => {
          toast.error({
            text1: 'เกิดข้อผิดพลาดบางอย่าง',
            icon: TriangleAlertIcon,
          })
        },
      }
    )
  }, [
    completeOnboardingMutation,
    state.profileStepResult,
    state.topicStepResult,
    state.addressStepResult,
    router,
  ])

  const contentInsets = {
    left: 24,
    right: 24,
  }

  return (
    <View className="flex-1 justify-between">
      {!openForm && (
        <>
          <View className="p-6 pt-4 w-full gap-2">
            <OnboardingAddressDetail address={address} handleOpenForm={handleOpenForm} />
          </View>
          <View className="gap-2 p-6 pt-0">
            <Button disabled={!address} onPress={handleEndOnboarding}>
              <Text>ยืนยัน</Text>
            </Button>
            <Button variant="ghost" onPress={handleSkip}>
              <Text>ข้ามและเริ่มต้นใช้งาน</Text>
            </Button>
          </View>
        </>
      )}
      {openForm && (
        <>
          <View className="gap-2 px-6 pb-6 pt-4">
            <form.Field
              name="province"
              listeners={{
                onChange: () => {
                  form.resetField('district')
                  form.resetField('subDistrict')
                  form.resetField('postalCode')
                },
              }}
            >
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>จังหวัด</FormLabel>
                  <FormControl>
                    <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกจังหวัด" />
                      </SelectTrigger>
                      <SelectContent insets={contentInsets} className="w-full">
                        <NativeSelectScrollView>
                          <SelectGroup>
                            <SelectLabel className="font-bold">เลือกจังหวัด</SelectLabel>
                            {getProvinceQuery.data?.map((province, index) => (
                              <SelectItem key={index} label={province} value={province} />
                            ))}
                          </SelectGroup>
                        </NativeSelectScrollView>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.values.province}>
              {(province) => (
                <form.Field
                  name="district"
                  listeners={{
                    onChange: () => {
                      form.setFieldValue('subDistrict', undefined)
                      form.setFieldValue('postalCode', undefined)
                    },
                  }}
                >
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>อำเภอ</FormLabel>
                      <FormControl>
                        <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                          <SelectTrigger className="w-full" disabled={!province}>
                            <SelectValue placeholder="เลือกอำเภอ" />
                          </SelectTrigger>
                          <SelectContent insets={contentInsets} className="w-full">
                            <NativeSelectScrollView>
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกอำเภอ</SelectLabel>
                                {getDistrictQuery.data?.map((district, index) => (
                                  <SelectItem key={index} label={district} value={district} />
                                ))}
                              </SelectGroup>
                            </NativeSelectScrollView>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
            <form.Subscribe selector={(state) => state.values.district}>
              {(district) => (
                <form.Field
                  name="subDistrict"
                  listeners={{
                    onChange: () => {
                      form.setFieldValue('postalCode', undefined)
                    },
                  }}
                >
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>ตำบล</FormLabel>
                      <FormControl>
                        <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                          <SelectTrigger className="w-full" disabled={!district}>
                            <SelectValue placeholder="เลือกตำบล" />
                          </SelectTrigger>
                          <SelectContent insets={contentInsets} className="w-full">
                            <NativeSelectScrollView>
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกตำบล</SelectLabel>
                                {getSubdistrictQuery.data?.map((subDistrict, index) => (
                                  <SelectItem key={index} label={subDistrict} value={subDistrict} />
                                ))}
                              </SelectGroup>
                            </NativeSelectScrollView>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
            <form.Subscribe selector={(state) => state.values.subDistrict}>
              {(subDistrict) => (
                <form.Field name="postalCode">
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>รหัสไปรษณีย์</FormLabel>
                      <FormControl>
                        <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                          <SelectTrigger className="w-full" disabled={!subDistrict}>
                            <SelectValue placeholder="เลือกรหัสไปรษณีย์" />
                          </SelectTrigger>
                          <SelectContent insets={contentInsets} className="w-full">
                            <NativeSelectScrollView>
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกรหัสไปรษณีย์</SelectLabel>
                                {getPostalCodeQuery.data?.map((postalCode, index) => (
                                  <SelectItem key={index} label={postalCode} value={postalCode} />
                                ))}
                              </SelectGroup>
                            </NativeSelectScrollView>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          </View>
          <View className="gap-2 px-6 pb-6">
            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
              {([isSubmitting, canSubmit]) => (
                <Button disabled={isSubmitting || !canSubmit} onPress={handleOnSubmit}>
                  <Text>บันทึก</Text>
                </Button>
              )}
            </form.Subscribe>
            <Button variant="ghost" onPress={handleSkip}>
              <Text>ข้ามและเริ่มต้นใช้งาน</Text>
            </Button>
          </View>
        </>
      )}
    </View>
  )
}

export function OnboardingAddressDetail({
  address,
  handleOpenForm,
}: {
  address: OnboardingAddressState | null
  handleOpenForm: () => void
}) {
  if (address) {
    return (
      <View className="p-4 bg-base-bg-default rounded-xl gap-2">
        <View>
          <Text className="font-anakotmai-medium">ที่อยู่ของคุณ</Text>
        </View>
        <View className="pb-2">
          <View>
            <Text className="font-noto-light line-clamp-1">
              ต.{address.subDistrict} อ.{address.district}
            </Text>
            <Text className="font-noto-light line-clamp-1">
              จ.{address.province} {address.postalCode}
            </Text>
          </View>
        </View>
        <Button variant="outline" onPress={handleOpenForm}>
          <Icon icon={Pencil} />
          <Text>แก้ไขที่อยู่</Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="p-4 bg-base-bg-default rounded-xl">
      <View className="pb-4">
        <Text className="font-anakotmai-medium">ที่อยู่ของคุณ</Text>
      </View>
      <Button onPress={handleOpenForm}>
        <Icon icon={PlusIcon} />
        <Text>เพิ่มที่อยู่</Text>
      </Button>
    </View>
  )
}

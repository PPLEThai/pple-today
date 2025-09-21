import React from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
import {
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
import { useRouter } from 'expo-router'
import { MessageCircleIcon, TriangleAlertIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { ImageMimeType } from '@app/types/file'
import { handleUploadImage } from '@app/utils/upload'

import { OnboardingAddressState, useOnboardingContext } from './onboarding-context'

import { AddressCard } from '../address-card'

const formSchema = z.object({
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกอเขต/อำเภอ'),
  subDistrict: z.string().min(1, 'กรุณาเลือกแขวง/ตำบล'),
  postalCode: z.string().min(1, 'กรุณาเลือกรหัสไปรษณีย์'),
})

export function OnboardingAddress() {
  const { state, dispatch } = useOnboardingContext()
  const [address, setAddress] = React.useState<OnboardingAddressState | null>(
    state.addressStepResult
  )
  const [openForm, setOpenForm] = React.useState(false)
  const [isEndOnboarding, setIsEndOnboarding] = React.useState(false)

  const getProvinceQuery = reactQueryClient.useQuery('/address/province', {})

  const form = useForm({
    defaultValues: {
      province: address?.province ?? '',
      district: address?.district ?? '',
      subDistrict: address?.subDistrict ?? '',
      postalCode: address?.postalCode ?? '',
    },
    validators: {
      onSubmit: formSchema,
      onBlur: formSchema,
    },
    onSubmit: (values) => {
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

  const provinceList = React.useMemo(() => {
    if (getProvinceQuery.data) {
      return getProvinceQuery.data
    }
    return []
  }, [getProvinceQuery.data])

  const districtList = React.useMemo(() => {
    if (getDistrictQuery.data) {
      return getDistrictQuery.data
    }
    return []
  }, [getDistrictQuery.data])

  const subDistrictList = React.useMemo(() => {
    if (getSubdistrictQuery.data) {
      return getSubdistrictQuery.data
    }
    return []
  }, [getSubdistrictQuery.data])
  const postalCodeList = React.useMemo(() => {
    if (getPostalCodeQuery.data) {
      return getPostalCodeQuery.data
    }
    return []
  }, [getPostalCodeQuery.data])

  const router = useRouter()

  const handleOpenForm = React.useCallback(() => {
    setOpenForm(true)
  }, [])

  const completeOnboardingMutation = reactQueryClient.useMutation('post', '/profile/on-boarding')

  const handleEndOnboarding = React.useCallback(async () => {
    setIsEndOnboarding(true)

    const addressPayload = state.addressStepResult
    const interestedTopicPayload = state.topicStepResult?.topics

    let profilePayload
    if (state.profileStepResult?.imagePickerAsset) {
      const { data: getLink } = await fetchClient('/profile/upload-url', {
        method: 'POST',
        body: {
          contentType: (state.profileStepResult.imagePickerAsset?.mimeType ||
            'image/png') as ImageMimeType,
        },
      })

      if (!getLink || !getLink.uploadUrl || !getLink.uploadFields) {
        throw new Error('Cannot get upload url')
      }

      await handleUploadImage(
        state.profileStepResult.imagePickerAsset,
        getLink.uploadUrl,
        getLink.uploadFields
      )
      profilePayload = {
        name: state.profileStepResult?.name ?? '',
        profileImagePath: getLink.fileKey ?? '',
      }
    } else if (state.profileStepResult?.name) {
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
          setIsEndOnboarding(false)
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

  const handleSkip = React.useCallback(() => {
    dispatch({ type: 'skip' })
    const { profileStepResult, topicStepResult, addressStepResult } = state

    if (profileStepResult || topicStepResult || addressStepResult) {
      handleEndOnboarding()
    } else {
      router.navigate('/')
    }
  }, [state, dispatch, handleEndOnboarding, router])

  const contentInsets = {
    left: 24,
    right: 24,
  }

  return (
    <View className="flex-1 justify-between">
      {!openForm && (
        <>
          <View className="p-6 pt-4 w-full gap-2">
            <AddressCard address={address} handleOpenForm={handleOpenForm} />
          </View>
          <View className="gap-2 p-6 pt-0">
            <Button disabled={!address || isEndOnboarding} onPress={handleEndOnboarding}>
              <Text>ยืนยัน</Text>
            </Button>
            <Button disabled={isEndOnboarding} variant="ghost" onPress={handleSkip}>
              <Text>ข้ามและเริ่มต้นใช้งาน</Text>
            </Button>
          </View>
        </>
      )}
      {openForm && (
        <>
          <View className="gap-2 px-6 pb-6 pt-4 flex-1">
            <ScrollView contentContainerClassName="gap-2 h-full">
              <form.Field
                name="province"
                listeners={{
                  onChange: () => {
                    form.setFieldValue('district', '')
                    form.setFieldValue('subDistrict', '')
                    form.setFieldValue('postalCode', '')
                  },
                }}
              >
                {(field) => (
                  <FormItem field={field}>
                    <FormLabel>จังหวัด</FormLabel>
                    <FormControl>
                      <Select
                        value={{ label: field.state.value, value: field.state.value }}
                        onValueChange={(option) => field.handleChange(option?.value || '')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกจังหวัด" />
                        </SelectTrigger>
                        <SelectContent insets={contentInsets} className="w-full">
                          <SelectGroup>
                            <SelectLabel className="font-bold">เลือกจังหวัด</SelectLabel>
                            {provinceList.map((province, index) => (
                              <SelectItem key={index} label={province} value={province} />
                            ))}
                          </SelectGroup>
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
                        form.setFieldValue('subDistrict', '')
                        form.setFieldValue('postalCode', '')
                      },
                    }}
                  >
                    {(field) => (
                      <FormItem field={field}>
                        <FormLabel>เขต/อำเภอ</FormLabel>
                        <FormControl>
                          <Select
                            value={{ label: field.state.value, value: field.state.value }}
                            onValueChange={(option) => field.handleChange(option?.value || '')}
                          >
                            <SelectTrigger className="w-full" disabled={!province}>
                              <SelectValue placeholder="เลือกเขต/อำเภอ" />
                            </SelectTrigger>
                            <SelectContent insets={contentInsets} className="w-full">
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกเขต/อำเภอ</SelectLabel>
                                {districtList.map((district, index) => (
                                  <SelectItem key={index} label={district} value={district} />
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                        form.setFieldValue('postalCode', '')
                      },
                    }}
                  >
                    {(field) => (
                      <FormItem field={field}>
                        <FormLabel>แขวง/ตำบล</FormLabel>
                        <FormControl>
                          <Select
                            value={{ label: field.state.value, value: field.state.value }}
                            onValueChange={(option) => field.handleChange(option?.value || '')}
                          >
                            <SelectTrigger className="w-full" disabled={!district}>
                              <SelectValue placeholder="เลือกแขวง/ตำบล" />
                            </SelectTrigger>
                            <SelectContent insets={contentInsets} className="w-full">
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกแขวง/ตำบล</SelectLabel>
                                {subDistrictList.map((subDistrict, index) => (
                                  <SelectItem key={index} label={subDistrict} value={subDistrict} />
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                          <Select
                            value={{ label: field.state.value, value: field.state.value }}
                            onValueChange={(option) => field.handleChange(option?.value || '')}
                          >
                            <SelectTrigger className="w-full" disabled={!subDistrict}>
                              <SelectValue placeholder="เลือกรหัสไปรษณีย์" />
                            </SelectTrigger>
                            <SelectContent insets={contentInsets} className="w-full">
                              <SelectGroup>
                                <SelectLabel className="font-bold">เลือกรหัสไปรษณีย์</SelectLabel>
                                {postalCodeList.map((postalCode, index) => (
                                  <SelectItem key={index} label={postalCode} value={postalCode} />
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  </form.Field>
                )}
              </form.Subscribe>
            </ScrollView>
          </View>
          <View className="gap-2 px-6 pb-6">
            <form.Subscribe
              selector={(state) => [state.isSubmitting, state.isFormValid, state.isTouched]}
            >
              {([isSubmitting, isFormValid, isTouched]) => (
                <Button
                  disabled={isSubmitting || !isFormValid || !isTouched}
                  onPress={form.handleSubmit}
                >
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

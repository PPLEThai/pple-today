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
import { H2 } from '@pple-today/ui/typography'
import { useForm, useStore } from '@tanstack/react-form'
import { useRouter } from 'expo-router'
import { MapPin } from 'lucide-react-native'
import { z } from 'zod/v4'

import { useEditingContext } from '@app/app/edit/_layout'
import { Header } from '@app/components/header-navigation'
import { reactQueryClient } from '@app/libs/api-client'

const formSchema = z.object({
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกเขต/อำเภอ'),
  subDistrict: z.string().min(1, 'กรุณาเลือกแขวง/ตำบล'),
  postalCode: z.string().min(1, 'กรุณาเลือกรหัสไปรษณีย์'),
})

export default function EditAddressPage() {
  const router = useRouter()

  const { state, dispatch } = useEditingContext()
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})

  const form = useForm({
    defaultValues: {
      province: state.addressStepResult?.province || profileQuery.data?.address?.province || '',
      district: state.addressStepResult?.district || profileQuery.data?.address?.district || '',
      subDistrict:
        state.addressStepResult?.subDistrict || profileQuery.data?.address?.subDistrict || '',
      postalCode:
        state.addressStepResult?.postalCode || profileQuery.data?.address?.postalCode || '',
    },
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
    },
    onSubmit: ({ value }) => {
      const addressPayload = {
        province: value.province,
        district: value.district,
        subDistrict: value.subDistrict,
        postalCode: value.postalCode,
      }

      dispatch({
        type: 'setEditingAddressResults',
        payload: addressPayload,
      })

      router.back()
    },
  })

  const provinceValues = useStore(form.store, (state) => state.values.province)
  const districtValues = useStore(form.store, (state) => state.values.district)
  const subdistrictValues = useStore(form.store, (state) => state.values.subDistrict)

  const getProvinceQuery = reactQueryClient.useQuery('/address/province', {})
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

  const contentInsets = {
    left: 24,
    right: 24,
  }

  return (
    <>
      <Header icon={MapPin} title="แก้ไขข้อมูลที่อยู่" />
      <View className="flex flex-col pt-1 px-6 gap-1 justify-between">
        <H2 className="text-base-primary-default pt-3 font-heading-semibold">ข้อมูลที่อยู่</H2>
        <Text className="font-heading-semibold text-base-text-medium">
          กรอกที่อยู่ เพื่อให้เราแนะนำข่าวสารที่ตรงกับพื้นที่ และความสนใจของคุณ
        </Text>
      </View>
      <View className="px-6 pb-6 pt-4">
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
      <View className="p-6 pt-4 absolute bottom-0 bg-base-bg-white w-full">
        <form.Subscribe
          selector={(state) => [state.isFormValid, state.isTouched, state.isSubmitting]}
        >
          {([isFormValid, isTouched, isSubmitting]) => (
            <Button
              onPress={form.handleSubmit}
              disabled={!isFormValid || !isTouched || isSubmitting}
            >
              <Text>บันทึก</Text>
            </Button>
          )}
        </form.Subscribe>
      </View>
    </>
  )
}

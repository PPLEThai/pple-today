import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input } from '@pple-today/ui/input'
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
import { useForm } from '@tanstack/react-form'
import { useRouter } from 'expo-router'
import { Pencil, PlusIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { OnboardingAddressState, useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกอำเภอ'),
  subdistrict: z.string().min(1, 'กรุณาเลือกตำบล'),
  postalCode: z.string().regex(/^\d{5}$/, 'รหัสไปรษณีย์ต้องประกอบไปด้วยตัวเลข 5 หลัก'),
})

const mockSelect = [
  {
    label: 'test_p1',
    value: 'test_p1',
  },
  {
    label: 'test_p2',
    value: 'test_p2',
  },
  {
    label: 'test_p3',
    value: 'test_p3',
  },
]

export function OnboardingAddress() {
  const { state, dispatch } = useOnboardingContext()
  const [address, setAddress] = React.useState<OnboardingAddressState | null>(
    state.addressStepResult ?? null
  )
  const [openForm, setOpenForm] = React.useState(false)

  const form = useForm({
    defaultValues: {
      province: address?.province ?? '',
      district: address?.district ?? '',
      subdistrict: address?.subdistrict ?? '',
      postalCode: address?.postalCode ?? '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values.value)

      dispatch({ type: 'setAddressStepResults', payload: values.value })
      setAddress(values.value)
      setOpenForm(false)
    },
  })

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

  const handleNext = React.useCallback(() => {
    router.navigate('/')
    console.log('Next')
    console.log(state.profileStepResult, state.topicStepResult, state.addressStepResult)
  }, [state, router])

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
            <Button disabled={!address} onPress={handleNext}>
              <Text>ยืนยัน</Text>
            </Button>
            <Button variant="ghost" onPress={handleSkip}>
              <Text>ข้าม</Text>
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
                  form.setFieldValue('district', '')
                  form.setFieldValue('subdistrict', '')
                  form.setFieldValue('postalCode', '')
                },
              }}
            >
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>จังหวัด</FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={{ label: field.state.value, value: field.state.value }}
                      onValueChange={(option) => field.handleChange(option?.value || '')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกจังหวัด" />
                      </SelectTrigger>
                      <SelectContent insets={contentInsets} className="w-full">
                        <SelectGroup>
                          <SelectLabel className="font-bold">เลือกจังหวัด</SelectLabel>
                          {mockSelect.map((province, index) => (
                            <SelectItem key={index} label={province.label} value={province.value} />
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
                      form.setFieldValue('subdistrict', '')
                      form.setFieldValue('postalCode', '')
                    },
                  }}
                >
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>อำเภอ</FormLabel>
                      <FormControl>
                        <Select
                          defaultValue={{ label: field.state.value, value: field.state.value }}
                          onValueChange={(option) => field.handleChange(option?.value || '')}
                        >
                          <SelectTrigger className="w-full" disabled={!province}>
                            <SelectValue placeholder="เลือกอำเภอ" />
                          </SelectTrigger>
                          <SelectContent insets={contentInsets} className="w-full">
                            <SelectGroup>
                              <SelectLabel className="font-bold">เลือกอำเภอ</SelectLabel>
                              {mockSelect.map((district, index) => (
                                <SelectItem
                                  key={index}
                                  label={district.label}
                                  value={district.value}
                                />
                              ))}
                            </SelectGroup>
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
                  name="subdistrict"
                  listeners={{
                    onChange: () => {
                      form.setFieldValue('postalCode', '')
                    },
                  }}
                >
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>ตำบล</FormLabel>
                      <FormControl>
                        <Select
                          defaultValue={{ label: field.state.value, value: field.state.value }}
                          onValueChange={(option) => field.handleChange(option?.value || '')}
                        >
                          <SelectTrigger className="w-full" disabled={!district}>
                            <SelectValue placeholder="เลือกตำบล" />
                          </SelectTrigger>
                          <SelectContent insets={contentInsets} className="w-full">
                            <SelectGroup>
                              <SelectLabel className="font-bold">เลือกตำบล</SelectLabel>
                              {mockSelect.map((subdistrict, index) => (
                                <SelectItem
                                  key={index}
                                  label={subdistrict.label}
                                  value={subdistrict.value}
                                />
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
            <form.Subscribe selector={(state) => state.values.subdistrict}>
              {(subdistrict) => (
                <form.Field name="postalCode">
                  {(field) => (
                    <FormItem field={field}>
                      <FormLabel>รหัสไปรษณีย์</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="กรอกรหัสไปรษณีย์"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          editable={!!subdistrict}
                        />
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
              <Text>ข้าม</Text>
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
              ต.{address.subdistrict} อ.{address.district}
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

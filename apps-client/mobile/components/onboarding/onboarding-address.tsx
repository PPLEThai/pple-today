import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem, FormLabel } from '@pple-today/ui/form'
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
import { useForm, useStore } from '@tanstack/react-form'
import { useRouter } from 'expo-router'
import { Pencil, PlusIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { OnboardingAddressState, useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  province: z.string().min(1),
  district: z.string().min(1),
  subdistrict: z.string().min(1),
  postalCode: z.string().min(1),
})

const mockSelect = [
  {
    label: 'test_p1',
    value: 'TestP1',
  },
  {
    label: 'test_p2',
    value: 'TestP2',
  },
  {
    label: 'test_p3',
    value: 'TestP3',
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
      province: state.addressStepResult?.province ?? '',
      district: state.addressStepResult?.district ?? '',
      subdistrict: state.addressStepResult?.subdistrict ?? '',
      postalCode: state.addressStepResult?.postalCode ?? '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values.value)

      dispatch({ type: 'setAddressStepResults', payload: values.value })
      setAddress(values.value)
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
    setOpenForm(false)
    form.handleSubmit()
  }, [form])

  const handleNext = React.useCallback(() => {
    router.navigate('/')
    console.log('Next')
    console.log(state.profileStepResult, state.topicStepResult, state.addressStepResult)
  }, [state, router])

  const hasProvince = useStore(form.store, (state) => state.values.province !== '')
  const hasDistrict = useStore(form.store, (state) => state.values.district !== '')
  const hasSubdistrict = useStore(form.store, (state) => state.values.subdistrict !== '')
  const hasPostalCode = useStore(form.store, (state) => state.values.postalCode !== '')
  const canContinue = useStore(
    form.store,
    () => hasProvince && hasDistrict && hasSubdistrict && hasPostalCode
  )

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
            <Button disabled={!canContinue} onPress={handleNext}>
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
            <form.Field name="province">
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>จังหวัด</FormLabel>
                  <FormControl>
                    <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
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
            <form.Field name="district">
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>อำเภอ</FormLabel>
                  <FormControl>
                    <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                      <SelectTrigger className="w-full" disabled={!hasProvince}>
                        <SelectValue placeholder="เลือกอำเภอ" />
                      </SelectTrigger>
                      <SelectContent insets={contentInsets} className="w-full">
                        <SelectGroup>
                          <SelectLabel className="font-bold">เลือกอำเภอ</SelectLabel>
                          {mockSelect.map((district, index) => (
                            <SelectItem key={index} label={district.label} value={district.value} />
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            </form.Field>
            <form.Field name="subdistrict">
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>ตำบล</FormLabel>
                  <FormControl>
                    <Select onValueChange={(option) => field.handleChange(option?.value || '')}>
                      <SelectTrigger className="w-full" disabled={!hasDistrict}>
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
                </FormItem>
              )}
            </form.Field>
            <form.Field name="postalCode">
              {(field) => (
                <FormItem field={field}>
                  <FormLabel>รหัสไปรษณีย์</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="กรอกรหัสไปรษณีย์"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            </form.Field>
          </View>
          <View className="gap-2 px-6 pb-6">
            <Button disabled={!canContinue} onPress={handleOnSubmit}>
              <Text>บันทึก</Text>
            </Button>
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

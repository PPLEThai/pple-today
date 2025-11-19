import { useFormContext } from 'react-hook-form'

import { ComboBox } from '@pple-today/web-ui/combobox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Label } from '@pple-today/web-ui/label'
import { RadioGroup, RadioGroupItem } from '@pple-today/web-ui/radio-group'
import { Textarea } from '@pple-today/web-ui/textarea'
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DateTimePicker'

import { reactQueryClient } from '~/libs/api-client'

import { ElectionFormValues } from './models'

interface ElectionGeneralInfoFormProps {
  isAbleToChangeMode?: boolean
}

export const ElectionGeneralInfoForm = ({
  isAbleToChangeMode = true,
}: ElectionGeneralInfoFormProps) => {
  const form = useFormContext<Omit<ElectionFormValues, 'candidates'>>()
  const electionType = form.watch('type')
  const province = form.watch('province')

  const provinceQuery = reactQueryClient.useQuery('/admin/address/province', {})
  const districtQuery = reactQueryClient.useQuery(
    '/admin/address/district',
    { query: { province } },
    {
      enabled: !!province,
    }
  )

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              ชื่อการเลือกตั้ง <span className="text-system-danger-default">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="กรอกชื่อการเลือกตั้ง" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>คำอธิบายการเลือกตั้ง</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="กรอกคำอธิบายการเลือกตั้ง" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-row gap-4">
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                จังหวัด <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <ComboBox
                  {...field}
                  onChange={(value) => {
                    field.onChange(value)
                    form.setValue('district', '')
                  }}
                  placeholder="เลือกจังหวัด"
                  disabled={provinceQuery.isLoading}
                  options={
                    provinceQuery.data?.map((p) => ({
                      label: p,
                      value: p,
                    })) || []
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                อำเภอ/เขต <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <ComboBox
                  {...field}
                  disabled={!province || districtQuery.isLoading}
                  options={
                    districtQuery.data?.map((p) => ({
                      label: p,
                      value: p,
                    })) || []
                  }
                  placeholder="เลือกอำเภอ/เขต"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>
              ประเภทการเลือกตั้ง <span className="text-system-danger-default">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)

                  if (value !== 'HYBRID') {
                    form.setValue('openRegister', undefined)
                    form.setValue('closeRegister', undefined)
                  }

                  if (value !== 'ONLINE') {
                    form.setValue('locationMapUrl', '')
                  }
                }}
                ref={field.ref}
                className="grid-cols-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ONLINE" id="radio-group-online" />
                  <Label htmlFor="radio-group-online">เลือกตั้ง Online</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ONSITE" id="radio-group-onsite" />
                  <Label htmlFor="radio-group-onsite">เลือกตั้งในสถานที่</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HYBRID" id="radio-group-hybrid" />
                  <Label htmlFor="radio-group-hybrid">เลือกตั้งแบบผสม</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="mode"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>
              ประเภทของการเชื่อมต่อข้อมูล <span className="text-system-danger-default">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                disabled={!isAbleToChangeMode}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                }}
                ref={field.ref}
                className="grid-cols-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FLEXIBLE" id="radio-group-flexible" />
                  <Label htmlFor="radio-group-flexible">
                    <div className="flex flex-col gap-2">
                      <Typography variant="small" className="text-base-text-high">
                        Flexible Mode
                      </Typography>
                      <Typography variant="small" className="text-base-text-placeholder">
                        ยังคงการเชื่อมต่อระหว่างบัตรเลือกตั้งกับผู้เลือกตั้งไว้เมื่อกดนับคะแนน
                      </Typography>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SECURE" id="radio-group-secure" />
                  <Label htmlFor="radio-group-secure">
                    <div className="flex flex-col gap-2">
                      <Typography variant="small">Secure Mode</Typography>
                      <Typography variant="small" className="text-base-text-placeholder">
                        ตัดการเชื่อมต่อระหว่างบัตรเลือกตั้งกับผู้เลือกตั้งทันทีเมื่อกดนับคะแนน
                      </Typography>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            {field.value === 'SECURE' && isAbleToChangeMode && (
              <Typography variant="small" className="text-system-danger-default m-auto mt-2">
                เมื่อเปลี่ยนประเภทการเชื่อมต่อข้อมูลเป็น Secure Mode แล้วจะไม่สามารถย้อนกลับได้
              </Typography>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      {electionType === 'HYBRID' && (
        <div className="flex flex-row gap-4">
          <FormField
            control={form.control}
            name="openRegister"
            render={({ field }) => (
              <FormItem className="basis-1/2 self-baseline">
                <FormLabel>
                  วันที่เปิดลงทะเบียน <span className="text-system-danger-default">*</span>
                </FormLabel>
                <FormControl>
                  <DateTimePicker {...field} placeholder="เลือกวันที่เปิดลงทะเบียน" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="closeRegister"
            render={({ field }) => (
              <FormItem className="basis-1/2 self-baseline">
                <FormLabel>
                  วันที่ปิดลงทะเบียน <span className="text-system-danger-default">*</span>
                </FormLabel>
                <FormControl>
                  <DateTimePicker {...field} placeholder="เลือกวันที่ปิดลงทะเบียน" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
      <div className="flex flex-row gap-4">
        <FormField
          control={form.control}
          name="openVoting"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                วันที่เปิดหีบ <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <DateTimePicker {...field} placeholder="เลือกวันที่เปิดหีบ" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="closeVoting"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                วันที่ปิดหีบ <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <DateTimePicker {...field} placeholder="เลือกวันที่ปิดหีบ" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {electionType !== 'ONLINE' && (
        <>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ชื่อสถานที่เลือกตั้ง <span className="text-system-danger-default">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="กรอกชื่อสถานที่" />
                </FormControl>
                <Typography variant="small" className="text-base-text-placeholder ">
                  กรอกชื่อสถานที่สำหรับการเลือกตั้งในสถานที่
                </Typography>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationMapUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  URL สถานที่เลือกตั้ง <span className="text-system-danger-default">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="กรอก URL สถานที่" />
                </FormControl>
                <Typography variant="small" className="text-base-text-placeholder ">
                  กรอก URL จาก Google Maps สำหรับการเลือกตั้งในสถานที่
                </Typography>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </>
  )
}

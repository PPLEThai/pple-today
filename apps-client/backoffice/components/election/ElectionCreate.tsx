import { ReactNode, useEffect, useState } from 'react'
import { SubmitHandler, useFieldArray, useForm, useFormContext } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Button } from '@pple-today/web-ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/web-ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Label } from '@pple-today/web-ui/label'
import { RadioGroup, RadioGroupItem } from '@pple-today/web-ui/radio-group'
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DateTimePicker'
import { FileUploadInput } from 'components/FileUploadInput'
import { CirclePlus, X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

const CreateElectionFormSchema = z.object({
  name: z.string({ error: 'กรุณากรอกชื่อการเลือกตั้ง' }).min(1, 'กรุณากรอกชื่อการเลือกตั้ง'),
  locationMapUrl: z.url({ error: 'กรุณากรอก URL สถานที่เลือกตั้งที่ถูกต้อง' }),
  province: z.string({ error: 'กรุณาเลือกจังหวัด' }).min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string({ error: 'กรุณาเลือกเขต' }).min(1, 'กรุณาเลือกเขต'),
  type: z.enum(['ONSITE', 'ONLINE', 'HYBRID'], {
    error: 'กรุณาเลือกประเภทการเลือกตั้ง',
  }),
  mode: z.enum(['FLEXIBLE', 'SECURE'], {
    error: 'กรุณาเลือกประเภทของการเชื่อมต่อข้อมูล',
  }),
  openRegister: z.date({ error: 'กรุณาเลือกวันที่เปิดลงทะเบียน' }),
  closeRegister: z.date({ error: 'กรุณาเลือกวันที่ปิดลงทะเบียน' }),
  openVoting: z.date({ error: 'กรุณาเลือกวันที่เปิดหีบ' }),
  closeVoting: z.date({ error: 'กรุณาเลือกวันที่ปิดหีบ' }),
  eligibleVoterFile: z.union([
    z
      .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
      .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
      ),
    z.literal('OLD_FILE'),
    z.literal('NO_FILE'),
  ]),
  candidates: z
    .array(
      z.object({
        number: z.number().optional(),
        name: z.string().min(1, 'กรุณากรอกชื่อผู้สมัคร'),
        imageFile: z.union([
          z
            .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
            .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
            .refine(
              (file) => ACCEPTED_FILE_TYPES.includes(file.type),
              'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
            ),
          z.literal('OLD_FILE'),
          z.literal('NO_FILE'),
        ]),
      })
    )
    .min(2, 'กรุณาสร้างผู้ลงสมัครอย่างน้อย 2 คน'),
})

type CreateElectionFormSchema = z.infer<typeof CreateElectionFormSchema>

const ElectionCreateGeneralInfo = () => {
  const form = useFormContext<CreateElectionFormSchema>()

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
      <div className="flex flex-row gap-4">
        <FormField
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                อำเภอ/เขต <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="กรอกอำเภอ/เขต" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem className="basis-1/2 self-baseline">
              <FormLabel>
                จังหวัด <span className="text-system-danger-default">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="กรอกจังหวัด" />
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
                onValueChange={field.onChange}
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
                value={field.value}
                onValueChange={field.onChange}
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
            <FormMessage />
          </FormItem>
        )}
      />
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
  )
}

const ElectionCreateEligibleVoters = () => {
  const form = useFormContext<CreateElectionFormSchema>()

  return (
    <>
      <FormField
        control={form.control}
        name="eligibleVoterFile"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ไฟล์รายชื่อผู้มีสิทธิ์ลงคะแนน</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <FileUploadInput>
                  <Input
                    type="file"
                    placeholder="เลือกไฟล์"
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                  />
                </FileUploadInput>
                <Button className="shrink-0" type="button" variant="secondary" size="icon">
                  <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                  <X className="size-6" />
                </Button>
              </div>
            </FormControl>
            <Typography variant="small" className="text-base-text-placeholder">
              อัปโหลดไฟล์รายชื่อผู้มีสิทธิ์ลงคะแนน (.csv, .xlsx)
            </Typography>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export const ElectionCreateCandidates = () => {
  const form = useFormContext<CreateElectionFormSchema>()
  const candidates = useFieldArray({
    control: form.control,
    name: 'candidates',
  })

  return (
    <FormField
      control={form.control}
      name="candidates"
      render={() => (
        <>
          <div className="space-y-1">
            <Typography variant="h6">
              ผู้ลงสมัคร <span className="text-system-danger-default">*</span>
            </Typography>
            <Typography variant="small" className="text-base-text-placeholder mb-4">
              สร้างอย่างน้อย 2 ตัวเลือก
            </Typography>
          </div>
          {candidates.fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-base-border-light bg-base-bg-light rounded-md p-4 mb-4 space-y-4"
            >
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name={`candidates.${index}.number`}
                  render={({ field }) => (
                    <FormItem className="basis-1/4 self-baseline">
                      <FormLabel>หมายเลขผู้สมัคร</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="กรอกหมายเลขผู้สมัคร" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`candidates.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="basis-3/4 self-baseline">
                      <FormLabel>
                        ชื่อผู้สมัคร <span className="text-system-danger-default">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="กรอกชื่อผู้สมัคร" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <FileUploadInput>
                  <Input
                    type="file"
                    placeholder="เลือกไฟล์"
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                  />
                </FileUploadInput>
                <Button className="shrink-0" type="button" variant="secondary" size="icon">
                  <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                  <X className="size-6" />
                </Button>
              </div>
              <Button size="sm" className="w-full" onClick={() => candidates.remove(index)}>
                ลบผู้สมัคร
              </Button>
            </div>
          ))}
          <FormMessage className="text-center" />
          <Button
            variant="outline"
            type="button"
            className="w-full border-dashed gap-2 text-base-secondary-light"
            onClick={() =>
              candidates.append({
                name: '',
                number: undefined,
                imageFile: 'NO_FILE',
              })
            }
          >
            <CirclePlus width={16} height={16} />
            เพิ่มผู้สมัคร
          </Button>
        </>
      )}
    />
  )
}

interface ElectionCreateFormProps {
  setIsOpen: (isOpen: boolean) => void
  onSuccess: () => void
}

export const ElectionCreateForm = (props: ElectionCreateFormProps) => {
  const form = useForm<CreateElectionFormSchema>({
    resolver: standardSchemaResolver(CreateElectionFormSchema),
    defaultValues: {
      name: '',
      eligibleVoterFile: 'NO_FILE',
      candidates: [],
    },
  })

  const onSubmit: SubmitHandler<CreateElectionFormSchema> = async () => {
    props.onSuccess()
    props.setIsOpen(false)
    form.reset()
  }

  return (
    <>
      <DialogTitle asChild>
        <Typography variant="h3">สร้างการเลือกตั้ง</Typography>
      </DialogTitle>
      <DialogDescription className="text-sm text-base-text-medium leading-tight">
        สร้างการเลือกตั้งสำหรับลงคะแนนภายในพรรค
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Form {...form}>
          <ElectionCreateGeneralInfo />
          <div className="my-4 border border-base-bg-default" />
          <ElectionCreateEligibleVoters />
          <div className="my-4 border border-base-bg-default" />
          <ElectionCreateCandidates />
          <div className="flex flex-row-reverse gap-2 mt-2">
            <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'กําลังบันทึก' : 'บันทึก'}
            </Button>
            <DialogTrigger asChild>
              <Button variant="ghost" className="flex-1 min-w-0">
                ยกเลิก
              </Button>
            </DialogTrigger>
          </div>
        </Form>
      </form>
    </>
  )
}

interface ElectionCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

export const ElectionCreate = (props: ElectionCreateProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pushing the change to the end of the call stack
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 0)

      return () => clearTimeout(timer)
    } else {
      document.body.style.pointerEvents = 'auto'
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild cardClassName="max-w-3xl">
        <ElectionCreateForm setIsOpen={setIsOpen} onSuccess={props.onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

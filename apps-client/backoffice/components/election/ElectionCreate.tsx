import { ReactNode, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

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
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DateTimePicker'
import z from 'zod'

interface ElectionCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

const CreateElectionFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อการเลือกตั้ง'),
  locationMapUrl: z.url().optional(),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกเขต'),
  type: z.enum(['ONSITE', 'ONLINE', 'HYBRID']),
  mode: z.enum(['FLEXIBLE', 'SECURE']),
  openRegister: z.date(),
  closeRegister: z.date(),
  openVoting: z.date(),
  closeVoting: z.date(),
})

type CreateElectionFormSchema = z.infer<typeof CreateElectionFormSchema>

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

  const onSubmit: SubmitHandler<CreateElectionFormSchema> = async ({ ...data }) => {
    props.onSuccess()
    setIsOpen(false)
    form.reset()
  }

  const form = useForm<CreateElectionFormSchema>({
    resolver: standardSchemaResolver(CreateElectionFormSchema),
    defaultValues: {
      name: '',
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild cardClassName="max-w-3xl">
        <DialogTitle asChild>
          <Typography variant="h3">สร้างการเลือกตั้ง</Typography>
        </DialogTitle>
        <DialogDescription className="text-sm text-base-text-medium leading-tight">
          สร้างการเลือกตั้งสำหรับลงคะแนนภายในพรรค
        </DialogDescription>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
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
                  <FormItem className="basis-1/2">
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
                  <FormItem className="basis-1/2">
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
                <FormItem>
                  <FormLabel>
                    ประเภทการเลือกตั้ง <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ประเภทของการเชื่อมต่อข้อมูล{' '}
                    <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row gap-4">
              <FormField
                control={form.control}
                name="openRegister"
                render={({ field }) => (
                  <FormItem className="basis-1/2">
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
                  <FormItem className="basis-1/2">
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
                  <FormItem className="basis-1/2">
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
                  <FormItem className="basis-1/2">
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
                <FormItem className="basis-1/2">
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
      </DialogContent>
    </Dialog>
  )
}

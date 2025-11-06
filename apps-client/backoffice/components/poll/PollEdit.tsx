import { ReactNode, useCallback, useEffect, useState } from 'react'
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form'

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { MultiSelect } from '@pple-today/web-ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pple-today/web-ui/select'
import { Separator } from '@pple-today/web-ui/separator'
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DateTimePicker'
import { CirclePlus, X } from 'lucide-react'
import z from 'zod'

import { GetPollsResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditPollFormSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อแบบสอบถาม'),
  endAt: z.date().min(new Date(), 'กรุณาเลือกวันที่ไม่น้อยกว่าวันนี้'),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
  topicIds: z.array(z.string()).min(1, 'กรุณาเลือกอย่างน้อย 1 หัวข้อ'),
  optionTitles: z
    .array(
      z.object({
        title: z.string().min(1, 'กรุณากรอกชื่อตัวเลือก'),
      })
    )
    .min(2, 'กรุณาสร้างอย่างน้อย 2 ตัวเลือก'),
})

type EditPollFormSchema = z.infer<typeof EditPollFormSchema>

interface PollEditProps {
  trigger: ReactNode
  onSuccess: () => void
  poll: GetPollsResponse['data'][number]
}

export const PollEdit = (props: PollEditProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const topicQuery = reactQueryClient.useQuery('/admin/topics', { query: {} })
  const pollMutation = reactQueryClient.useMutation('patch', '/admin/polls/:pollId')

  // The Dialog turn the pointerEvent to none, making the popover, select compoents can not be selected
  // Thanks to this discussion
  // https://github.com/radix-ui/primitives/issues/2122#issuecomment-2140827998
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

  const form = useForm<EditPollFormSchema>({
    resolver: standardSchemaResolver(EditPollFormSchema),
    defaultValues: {
      title: props.poll.title,
      endAt: new Date(props.poll.endAt),
      type: props.poll.type,
      topicIds: props.poll.topics,
      optionTitles: props.poll.options,
    },
  })

  const { control } = form
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'optionTitles',
  })

  const resetForm = useCallback(() => {
    form.reset({
      title: props.poll.title,
      endAt: new Date(props.poll.endAt),
      type: props.poll.type,
      topicIds: props.poll.topics,
      optionTitles: props.poll.options,
    })
  }, [form, props.poll])

  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<EditPollFormSchema> = async ({ ...data }) => {
    const preparePayload = {
      ...data,
      description: null,
      optionTitles: data.optionTitles.flatMap((option) => option.title),
    }

    await pollMutation.mutateAsync({
      pathParams: { pollId: props.poll.id },
      body: preparePayload,
    })

    props.onSuccess()
    setIsOpen(false)
    resetForm()
  }

  useEffect(() => {
    resetForm()
  }, [resetForm])

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild>
        <DialogTitle asChild>
          <Typography variant="h3">แก้ไขแบบสอบถาม</Typography>
        </DialogTitle>
        <DialogDescription className="text-sm text-base-text-medium leading-tight">
          แก้ไขรายละเอียดแบบสอบถามสำหรับรวบรวมความคิดเห็นจากผู้ใช้งาน
        </DialogDescription>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-row gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="basis-2/3">
                    <FormLabel>
                      ชื่อประกาศ <span className="text-system-danger-default">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="กรอกชื่อแบบสอบถาม" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem className="basis-1/3">
                    <FormLabel>
                      วันที่หมดอายุ <span className="text-system-danger-default">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="เลือกวันที่หมดอายุ"
                        className="w-full"
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
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    ประเภทประกาศ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select {...field} defaultValue={field.value} onValueChange={onChange}>
                      <SelectTrigger className="w-full gap-4 !h-10">
                        <SelectValue placeholder="เลือกประเภทแบบสอบถาม" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE_CHOICE">ตอบได้ 1 ตัวเลือก</SelectItem>
                        <SelectItem value="MULTIPLE_CHOICE">ตอบได้หลายตัวเลือก</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topicIds"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    หัวข้อ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={
                        topicQuery.data?.data.map((t) => ({ value: t.id, label: t.name })) ?? []
                      }
                      {...field}
                      defaultValue={field.value}
                      onValueChange={onChange}
                      placeholder="เลือกหัวข้อ"
                    />
                  </FormControl>
                  <FormMessage asChild>
                    <FormDescription>เลือกอย่างน้อย 1 หัวข้อ</FormDescription>
                  </FormMessage>
                </FormItem>
              )}
            />
            <Separator className="my-4" />
            <FormLabel>
              ตัวเลือก <span className="text-system-danger-default">*</span>
            </FormLabel>
            <FormDescription>สร้างอย่างน้อย 2 ตัวเลือก</FormDescription>
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`optionTitles.${index}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-row gap-2 shrink-0">
                        <Input {...field} placeholder="กรุณากรอกชื่อตัวเลือก" />
                        {fields.length > 2 && (
                          <Button variant="secondary" onClick={() => remove(index)}>
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="button"
              variant="secondary"
              className="mt-2 border flex-1 w-full"
              onClick={() => append({ title: '' })}
            >
              <CirclePlus className="h-4 w-4 mr-1" /> เพิ่มตัวเลือก
            </Button>
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

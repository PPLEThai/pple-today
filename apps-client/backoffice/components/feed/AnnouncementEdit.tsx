import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
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
import { Textarea } from '@pple-today/web-ui/textarea'
import { Typography } from '@pple-today/web-ui/typography'
import { ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT, AnnouncementIcon } from 'components/AnnouncementIcon'
import { FileUploadInput } from 'components/FileUpload'
import { X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

import { DetailedAnnouncement, FilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditAnnouncementFormSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อประกาศ'),
  type: z.enum(['OFFICIAL', 'PARTY_COMMUNICATE', 'INTERNAL']),
  content: z.string().min(1, 'กรุณากรอกรายละเอียด'),
  topicIds: z.array(z.string()).min(1, 'กรุณาเลือกอย่างน้อย 1 หัวข้อ'),
  attachmentFile: z.union([
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

type EditAnnouncementFormSchema = z.infer<typeof EditAnnouncementFormSchema>

interface AnnouncementEditProps {
  trigger: ReactNode
  onSuccess: () => void
  announcement: DetailedAnnouncement
}

export const AnnouncementEdit = (props: AnnouncementEditProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const topicQuery = reactQueryClient.useQuery('/admin/topics', { query: {} })
  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const updateAnnouncementMutation = reactQueryClient.useMutation(
    'patch',
    '/admin/announcements/:announcementId'
  )

  const form = useForm<EditAnnouncementFormSchema>({
    resolver: standardSchemaResolver(EditAnnouncementFormSchema),
    defaultValues: {
      title: props.announcement.title,
      type: props.announcement.type,
      content: props.announcement.content ?? '',
      topicIds: props.announcement.topics.map((topic) => topic.id),
      attachmentFile: 'OLD_FILE',
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const clearFile = (value: 'OLD_FILE' | 'NO_FILE' = 'OLD_FILE') => {
    if (elFileInput.current) elFileInput.current.value = ''
    form.setValue('attachmentFile', value, { shouldValidate: true, shouldDirty: true })
  }

  const resetForm = useCallback(() => {
    form.reset({
      title: props.announcement.title,
      type: props.announcement.type,
      content: props.announcement.content ?? '',
      topicIds: props.announcement.topics.map((topic) => topic.id),
      attachmentFile: 'OLD_FILE',
    })
  }, [
    form,
    props.announcement.content,
    props.announcement.title,
    props.announcement.topics,
    props.announcement.type,
  ])

  const onSubmit: SubmitHandler<EditAnnouncementFormSchema> = async ({
    attachmentFile,
    ...data
  }) => {
    let attachmentFilePaths: FilePath[] = props.announcement.attachments.map((a) => a.filePath)

    if (attachmentFile === 'NO_FILE') {
      attachmentFilePaths = []
    } else if (attachmentFile !== 'OLD_FILE') {
      const result = await getFileUploadUrl.mutateAsync({
        body: {
          category: 'ANNOUNCEMENT',
          contentType: attachmentFile.type as any,
        },
      })

      await handleUploadFile(attachmentFile, result.uploadUrl, result.uploadFields)

      attachmentFilePaths = [result.filePath as FilePath]
    }

    await updateAnnouncementMutation.mutateAsync({
      pathParams: { announcementId: props.announcement.id },
      body: { ...data, attachmentFilePaths },
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">แก้ไขประกาศ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขรายละเอียดประกาศสำหรับแจ้งข้อมูลข่าวสาร
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อประกาศ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อประกาศ" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                        <AnnouncementIcon
                          className="shrink-0 size-8"
                          announcementType={field.value}
                        />
                        <span className="mr-auto">
                          <SelectValue placeholder="เลือกประเภทประกาศ" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFICIAL">
                          {ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT.OFFICIAL}
                        </SelectItem>
                        <SelectItem value="PARTY_COMMUNICATE">
                          {ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT.PARTY_COMMUNICATE}
                        </SelectItem>
                        <SelectItem value="INTERNAL">
                          {ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT.INTERNAL}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    รายละเอียด <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="กรอกรายละเอียด" />
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
            <FormField
              control={form.control}
              name="attachmentFile"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>เอกสารประกอบ</FormLabel>
                  <div className="flex gap-2 min-w-0">
                    <FormControl>
                      <FileUploadInput
                        fileName={
                          value === 'NO_FILE'
                            ? undefined
                            : value === 'OLD_FILE'
                              ? props.announcement.attachments[0]?.filePath
                              : value.name
                        }
                      >
                        <Input
                          type="file"
                          {...field}
                          ref={(el) => {
                            elFileInput.current = el
                            ref(el)
                          }}
                          onChange={(ev) =>
                            onChange(
                              ev.target.files && ev.target.files.length > 0
                                ? ev.target.files[0]
                                : undefined
                            )
                          }
                          placeholder="เลือกไฟล์"
                          accept={ACCEPTED_FILE_TYPES.join(',')}
                        />
                      </FileUploadInput>
                    </FormControl>
                    {typeof value === 'string' ? (
                      value === 'OLD_FILE' &&
                      props.announcement.attachments.length > 0 && (
                        <Button
                          className="shrink-0"
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => clearFile('NO_FILE')}
                        >
                          <span className="sr-only">ลบไฟล์เดิม</span>
                          <X className="size-4" />
                        </Button>
                      )
                    ) : (
                      <Button
                        className="shrink-0"
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => clearFile()}
                      >
                        <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  <FormMessage asChild>
                    <FormDescription>
                      อัปโหลดไฟล์ประเภท PDF / JPG / PNG ขนาดไม่เกิน 5 MB
                    </FormDescription>
                  </FormMessage>
                </FormItem>
              )}
            />
            <div className="flex flex-row-reverse gap-2 mt-2">
              <Button
                type="submit"
                className="flex-1 min-w-0"
                disabled={form.formState.isSubmitting}
              >
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

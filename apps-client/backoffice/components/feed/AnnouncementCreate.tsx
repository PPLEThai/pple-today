import { ReactNode, useRef, useState } from 'react'
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
import { X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

import { FilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const CreateAnnouncementFormSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อประกาศ'),
  type: z.enum(['OFFICIAL', 'PARTY_COMMUNICATE', 'INTERNAL']),
  content: z.string().min(1, 'กรุณากรอกรายละเอียด'),
  attachmentFiles: z.array(
    z
      .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
      .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
      )
  ),
})

type CreateAnnouncementFormSchema = z.infer<typeof CreateAnnouncementFormSchema>

interface AnnouncementCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

export const AnnouncementCreate = (props: AnnouncementCreateProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const createAnnouncementMutation = reactQueryClient.useMutation('post', '/admin/announcements')

  const form = useForm<CreateAnnouncementFormSchema>({
    resolver: standardSchemaResolver(CreateAnnouncementFormSchema),
    defaultValues: {
      title: '',
      type: 'INTERNAL',
      content: '',
      attachmentFiles: [],
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    if (elFileInput.current) elFileInput.current.value = ''
    form.setValue('attachmentFiles', [], { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit: SubmitHandler<CreateAnnouncementFormSchema> = async ({
    attachmentFiles,
    ...data
  }) => {
    const attachmentUploadFilePaths = await Promise.all(
      attachmentFiles.map(async (file) => {
        const result = await getFileUploadUrl.mutateAsync({
          body: {
            category: 'ANNOUNCEMENT',
            contentType: file.type as any,
          },
        })

        await handleUploadFile(file, result.uploadUrl, result.uploadFields)

        return result.filePath as FilePath
      })
    )

    await createAnnouncementMutation.mutateAsync({
      body: { ...data, attachmentFilePaths: attachmentUploadFilePaths },
    })

    props.onSuccess()

    setIsOpen(false)
    form.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">สร้างประกาศ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                สร้างประกาศสำหรับแจ้งข้อมูลข่าวสาร
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
                    <Select onValueChange={onChange} {...field}>
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
              name="attachmentFiles"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>เอกสารประกอบ</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="file"
                        className="p-0 pr-3 file:px-3 file:py-2 file:mr-3 file:border-0 file:border-solid file:border-r file:border-r-input file:h-10 file:bg-secondary file:hover:opacity-80 file:active:opacity-80 file:text-secondary-foreground file:cursor-pointer file:font-medium file:aria-[invalid=true]:border-r-system-danger-default file:aria-[invalid=true]:text-system-danger-default file:aria-[invalid=true]:bg-system-danger-extra-light"
                        {...field}
                        ref={(el) => {
                          elFileInput.current = el
                          ref(el)
                        }}
                        onChange={(ev) =>
                          onChange(ev.target.files?.length === 0 ? [] : ev.target.files)
                        }
                        placeholder="เลือกไฟล์"
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                        multiple
                      />
                    </FormControl>
                    {value && value.length > 0 && (
                      <Button variant="secondary" size="icon" onClick={clearFile}>
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

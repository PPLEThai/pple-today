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

import { DetailedAnnouncement, FilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditAnnouncementFormSchema = z.object({
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

type EditAnnouncementFormSchema = z.infer<typeof EditAnnouncementFormSchema>

interface AnnouncementEditProps {
  trigger: ReactNode
  onSuccess: () => void
  announcement: DetailedAnnouncement
}

export const AnnouncementEdit = (props: AnnouncementEditProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const updateAnnouncementMutation = reactQueryClient.useMutation(
    'patch',
    '/admin/announcements/:announcementId'
  )

  const form = useForm<EditAnnouncementFormSchema>({
    resolver: standardSchemaResolver(EditAnnouncementFormSchema),
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

  const resetForm = useCallback(() => {
    form.reset({
      title: props.announcement.title,
      type: props.announcement.type,
      content: props.announcement.content ?? '',
      attachmentFiles: [],
    })
  }, [form, props.announcement.content, props.announcement.title, props.announcement.type])

  const onSubmit: SubmitHandler<EditAnnouncementFormSchema> = async ({
    attachmentFiles,
    ...data
  }) => {
    /**
     * - ถ้าเขียนแบบนี้ = ถ้าเลือกไฟล์ ก็อัพขึ้นไปใหม่เลย เดี๋ยวไฟล์เก่าเซิฟจะ clean up เอง
     * - แต่ จะไม่สามารถเอาไฟล์ออกแบบเลือกไฟล์ หรือเอาออกทั้งหมดได้
     * - ถ้าจะเอาออก ต้องอัพไฟล์สักอันไปทับไฟล์เดิม (เข้าโฟลวข้อแรก)
     * - TODO: ปรึกษา UX ตรงนี้
     */
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

    await updateAnnouncementMutation.mutateAsync({
      pathParams: { announcementId: props.announcement.id },
      body: { ...data, attachmentFilePaths: attachmentUploadFilePaths },
    })

    props.onSuccess()

    setIsOpen(false)
    resetForm()
  }

  useEffect(() => {
    resetForm()
  }, [resetForm])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

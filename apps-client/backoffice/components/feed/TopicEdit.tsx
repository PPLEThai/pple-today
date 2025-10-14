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
import { Textarea } from '@pple-today/web-ui/textarea'
import { Typography } from '@pple-today/web-ui/typography'
import { ImagePreview } from 'components/ImagePreview'
import { X } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/fileupload'
import z from 'zod'

import { DetailedTopic, FilePath } from '@api/backoffice/admin'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

const EditTopicFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหัวข้อ'),
  description: z.string(),
  hashtagIds: z.array(z.string()).min(1, 'กรุณาเลือกอย่างน้อย 1 แฮชแท็ก'),
  bannerImage: z
    .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
    .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG')
    .optional(),
})

type EditTopicFormSchema = z.infer<typeof EditTopicFormSchema>

interface TopicEditProps {
  trigger: ReactNode
  onSuccess: () => void
  topic: DetailedTopic
}

export const TopicEdit = (props: TopicEditProps) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const hashtagQuery = reactQueryClient.useQuery('/admin/hashtags', { query: {} })
  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const updateTopicMutation = reactQueryClient.useMutation('patch', '/admin/topics/:topicId')

  const form = useForm<EditTopicFormSchema>({
    resolver: standardSchemaResolver(EditTopicFormSchema),
    defaultValues: {
      name: props.topic.name,
      description: props.topic.description ?? '',
      hashtagIds: props.topic.hashtags.map((hashtag) => hashtag.id),
      bannerImage: undefined,
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)
  const clearFileInput = () => {
    if (elFileInput.current?.value) elFileInput.current.value = ''
    form.setValue('bannerImage', undefined, { shouldValidate: true })
  }

  const resetForm = useCallback(() => {
    form.reset({
      name: props.topic.name,
      description: props.topic.description ?? '',
      hashtagIds: props.topic.hashtags.map((hashtag) => hashtag.id),
      bannerImage: undefined,
    })
  }, [form, props.topic.description, props.topic.hashtags, props.topic.name])

  const onSubmit: SubmitHandler<EditTopicFormSchema> = async ({ bannerImage, ...data }) => {
    let bannerImagePath: FilePath | undefined

    if (bannerImage) {
      const result = await getFileUploadUrl.mutateAsync({
        body: {
          category: 'TOPIC',
          contentType: bannerImage.type as any,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      await handleUploadFile(bannerImage, result.uploadUrl, result.uploadFields)

      bannerImagePath = result.filePath as FilePath
    }

    await updateTopicMutation.mutateAsync({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      pathParams: {
        topicId: props.topic.id,
      },
      body: {
        ...data,
        bannerImagePath,
      },
    })

    props.onSuccess()

    setIsOpen(false)
    resetForm()
  }

  useEffect(() => {
    const fetchAccessToken = async () => {
      const user = await userManager.getUser()
      setAccessToken(user?.access_token ?? null)
    }
    fetchAccessToken()
  }, [])

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
                <Typography variant="h3">แก้ไขหัวข้อ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขรายละเอียดหัวข้อสำหรับจัดกลุ่มเนื้อหาและแฮชแท็ก
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อหัวข้อ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อหัวข้อ" />
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
                  <FormLabel>รายละเอียด</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="กรอกรายละเอียด" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hashtagIds"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    แฮชแท็ก <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={
                        hashtagQuery.data?.data.map((h) => ({ value: h.id, label: h.name })) ?? []
                      }
                      {...field}
                      defaultValue={field.value}
                      onValueChange={onChange}
                      placeholder="เลือกแฮชแท็ก"
                    />
                  </FormControl>
                  <FormMessage asChild>
                    <FormDescription>เลือกอย่างน้อย 1 แฮชแท็ก</FormDescription>
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bannerImage"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    รูปหัวข้อ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="file"
                        className="min-w-0 flex-1 p-0 pr-3 file:px-3 file:py-2 file:mr-3 file:border-0 file:border-solid file:border-r file:border-r-input file:h-10 file:bg-secondary file:hover:opacity-80 file:active:opacity-80 file:text-secondary-foreground file:cursor-pointer file:font-medium file:aria-[invalid=true]:border-r-system-danger-default file:aria-[invalid=true]:text-system-danger-default file:aria-[invalid=true]:bg-system-danger-extra-light"
                        {...field}
                        ref={(el) => {
                          elFileInput.current = el
                          ref(el)
                        }}
                        onChange={(ev) => onChange(ev.target.files?.[0])}
                        placeholder="เลือกไฟล์"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      />
                    </FormControl>
                    {value && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={clearFileInput}
                      >
                        <X className="size-6" />
                      </Button>
                    )}
                  </div>
                  <ImagePreview
                    className="rounded-md overflow-hidden w-full h-[120px] object-center object-cover"
                    src={value || props.topic.bannerImage?.url}
                  />
                  <FormMessage asChild>
                    <FormDescription>อัปโหลดไฟล์ประเภท JPG / PNG ขนาดไม่เกิน 5 MB</FormDescription>
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

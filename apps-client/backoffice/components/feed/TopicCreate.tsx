import { ReactNode, useEffect, useRef, useState } from 'react'
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
import z from 'zod'

import { FilePath } from '@api/backoffice/admin'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

const handleUploadFile = async (
  file: File,
  uploadUrl: string,
  uploadFields: Record<string, string>
) => {
  const formData = new FormData()

  for (const [key, value] of Object.entries(uploadFields)) {
    formData.append(key, value)
  }

  formData.append('file', file)

  await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })
}

const CreateTopicFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหัวข้อ'),
  description: z.string(),
  hashtagIds: z.array(z.string()).min(1, 'กรุณาเลือกอย่างน้อย 1 แฮชแท็ก'),
  bannerImage: z
    .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
    .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG'),
})

type CreateTopicFormSchema = z.infer<typeof CreateTopicFormSchema>

interface TopicCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

export const TopicCreate = (props: TopicCreateProps) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const hashtagQuery = reactQueryClient.useQuery('/admin/hashtags', { query: {} })
  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const createTopicMutation = reactQueryClient.useMutation('post', '/admin/topics')

  const form = useForm<CreateTopicFormSchema>({
    resolver: standardSchemaResolver(CreateTopicFormSchema),
    defaultValues: {
      name: '',
      description: '',
      hashtagIds: [],
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const onSubmit: SubmitHandler<CreateTopicFormSchema> = async ({ bannerImage, ...data }) => {
    console.log('getFileUploadUrl.mutateAsync')
    const result = await getFileUploadUrl.mutateAsync({
      body: {
        category: 'TOPIC',
        contentType: bannerImage.type as any,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    console.log('— Done')

    console.log('handleUploadFile')
    await handleUploadFile(bannerImage, result.uploadUrl, result.uploadFields)
    console.log('— Done')

    console.log('createTopicMutation.mutateAsync')
    await createTopicMutation.mutateAsync({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        ...data,
        bannerImagePath: result.filePath as FilePath,
      },
    })
    console.log('— Done')

    props.onSuccess()

    setIsOpen(false)
    form.reset()
  }

  useEffect(() => {
    const fetchAccessToken = async () => {
      const user = await userManager.getUser()
      setAccessToken(user?.access_token ?? null)
    }
    fetchAccessToken()
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">สร้างหัวข้อ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                สร้างหัวข้อสำหรับจัดกลุ่มเนื้อหาและแฮชแท็ก
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
                  <FormControl>
                    <Input
                      type="file"
                      className="p-0 pr-3 file:px-3 file:py-2 file:mr-3 file:border-0 file:border-solid file:border-r file:border-r-input file:h-10 file:bg-secondary file:hover:opacity-80 file:active:opacity-80 file:text-secondary-foreground file:cursor-pointer file:font-medium file:aria-[invalid=true]:border-r-system-danger-default file:aria-[invalid=true]:text-system-danger-default file:aria-[invalid=true]:bg-system-danger-extra-light"
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
                    <ImagePreview
                      className="rounded-md overflow-hidden w-full h-[120px] object-center object-cover"
                      src={value}
                    />
                  )}
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

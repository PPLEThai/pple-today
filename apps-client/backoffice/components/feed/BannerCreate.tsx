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
import { Typography } from '@pple-today/web-ui/typography'
import { FileUploadInput } from 'components/FileUploadInput'
import { ImagePreview } from 'components/ImagePreview'
import { X } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

import { FilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const CreateBannerFormSchema = z.object({
  headline: z.string().min(1, 'กรุณากรอกชื่อรูป'),
  destination: z.string().min(1, 'กรุณากรอก URL / ID ที่เชื่อมต่อ'),
  navigation: z.enum(['IN_APP_NAVIGATION', 'EXTERNAL_BROWSER', 'MINI_APP']),
  imageFile: z
    .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
    .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
    ),
})

type CreateBannerFormSchema = z.infer<typeof CreateBannerFormSchema>

interface BannerCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

export const BannerCreate = (props: BannerCreateProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const createBannerMutation = reactQueryClient.useMutation('post', '/admin/banners')

  const form = useForm<CreateBannerFormSchema>({
    resolver: standardSchemaResolver(CreateBannerFormSchema),
    defaultValues: {
      headline: '',
      destination: '',
      navigation: 'EXTERNAL_BROWSER',
      imageFile: undefined,
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    if (elFileInput.current) elFileInput.current.value = ''
    form.setValue('imageFile', undefined as unknown as File, { shouldDirty: true })
  }

  const onSubmit: SubmitHandler<CreateBannerFormSchema> = async ({ imageFile, ...data }) => {
    const result = await getFileUploadUrl.mutateAsync({
      body: {
        category: 'BANNER',
        contentType: imageFile.type as any,
      },
    })

    await handleUploadFile(imageFile, result.uploadUrl, result.uploadFields)

    await createBannerMutation.mutateAsync({
      body: { ...data, imageFilePath: result.filePath as FilePath },
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
                <Typography variant="h3">สร้างรูปแบนเนอร์</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                สร้างรูปแบนเนอร์สำหรับโปรโมทข้อมูล
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อรูป <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อรูปแบนเนอร์" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    URL / ID ที่เชื่อมต่อ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอก URL หรือ ID ที่ต้องการ" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="navigation"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    ประเภทประกาศ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select {...field} onValueChange={onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกประเภทประกาศ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXTERNAL_BROWSER">External Browser</SelectItem>
                        <SelectItem value="IN_APP_NAVIGATION">In App Navigation</SelectItem>
                        <SelectItem value="MINI_APP">Mini App</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageFile"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    รูปแบนเนอร์ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <div className="flex gap-2 min-w-0">
                    <FormControl>
                      <FileUploadInput fileName={value?.name} preview={value}>
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
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        />
                      </FileUploadInput>
                    </FormControl>
                    {value && (
                      <Button
                        className="shrink-0"
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={clearFile}
                      >
                        <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                        <X className="size-6" />
                      </Button>
                    )}
                  </div>
                  {value && (
                    <ImagePreview
                      className="rounded-md overflow-hidden w-full h-[120px] object-cover"
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

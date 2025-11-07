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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { ImagePreview } from 'components/ImagePreview'
import { Pencil, X } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

import { FilePath, GetUserByIdResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditUserFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อที่แสดง'),
  imageFile: z
    .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
    .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG')
    .optional(),
})

type EditUserFormSchema = z.infer<typeof EditUserFormSchema>

interface UserEditProps {
  trigger: ReactNode
  onSuccess: () => void
  user: GetUserByIdResponse
}

export const UserEdit = (props: UserEditProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const updateUserMutation = reactQueryClient.useMutation('patch', '/admin/users/:userId')

  const form = useForm<EditUserFormSchema>({
    resolver: standardSchemaResolver(EditUserFormSchema),
    defaultValues: {
      name: props.user.name,
      imageFile: undefined,
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    if (elFileInput.current?.value) elFileInput.current.value = ''
    form.setValue('imageFile', undefined, { shouldDirty: true })
  }

  const resetForm = useCallback(() => {
    form.reset({
      name: props.user.name,
      imageFile: undefined,
    })
  }, [form, props.user.name])

  const onSubmit: SubmitHandler<EditUserFormSchema> = async ({ imageFile, ...data }) => {
    let profileImage: FilePath | undefined

    if (imageFile) {
      const result = await getFileUploadUrl.mutateAsync({
        body: {
          id: props.user.id,
          category: 'PROFILE_IMAGE',
          contentType: imageFile.type as any,
        },
      })

      await handleUploadFile(imageFile, result.uploadUrl, result.uploadFields)

      profileImage = result.filePath as FilePath
    }

    await updateUserMutation.mutateAsync({
      pathParams: { userId: props.user.id },
      body: {
        ...data,
        profileImage,
      },
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
      <DialogContent cardClassName="max-w-[343px]" asChild>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">แก้ไขข้อมูลผู้ใช้งาน</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขชื่อและรูปของผู้ใช้งาน
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="imageFile"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    <span className="sr-only">รูปโปรไฟล์</span>
                  </FormLabel>
                  <div className="relative mx-auto">
                    <ImagePreview
                      className="rounded-full overflow-hidden size-[144px] object-cover"
                      src={value || props.user.profileImage || '/images/placeholder.svg'}
                    />
                    <div className="absolute bottom-0 right-0">
                      <FormControl>
                        <label className="flex items-center justify-center border-2 border-white bg-base-primary-default rounded-full size-9 cursor-pointer">
                          <span className="sr-only">เลือกรูปโปรไฟล์ใหม่</span>
                          <Pencil className="shrink-0 stroke-white" size={20} />
                          <Input
                            className="hidden"
                            type="file"
                            {...field}
                            ref={(el) => {
                              elFileInput.current = el
                              ref(el)
                            }}
                            onChange={(ev) => onChange(ev.target.files?.[0])}
                            placeholder="เลือกไฟล์"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          />
                        </label>
                      </FormControl>
                    </div>
                    {value && (
                      <button
                        type="button"
                        className="absolute top-0 right-0 flex items-center justify-center border-2 border-white bg-base-bg-default rounded-full size-9"
                        onClick={clearFile}
                      >
                        <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                        <X className="shrink-0" size={20} />
                      </button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อที่แสดง</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อที่แสดง" />
                  </FormControl>
                  <FormMessage />
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

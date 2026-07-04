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
import { Switch } from '@pple-today/web-ui/switch'
import { Typography } from '@pple-today/web-ui/typography'
import { FileUploadInput } from 'components/FileUploadInput'
import { ImagePreview } from 'components/ImagePreview'
import { X } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import { resizeImageToPng } from 'utils/resize-image'
import { getRoleName, ROLES } from 'utils/roles'
import z from 'zod'

import { MiniApp, TemporaryFilePath, UpdateMiniAppBody } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: getRoleName(role) }))

const EditMiniAppFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ Mini App'),
  slug: z.string().min(1, 'กรุณากรอก slug'),
  url: z.url('กรุณากรอก URL ที่ถูกต้อง'),
  order: z.number().int('กรุณากรอกลำดับเป็นจำนวนเต็ม'),
  clientId: z.string().min(1, 'กรุณากรอก Client ID'),
  roles: z.array(z.string()),
  requiresAuth: z.boolean(),
  iconFile: z
    .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === 'image/svg+xml',
      'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG / SVG'
    )
    .optional(),
})

type EditMiniAppFormSchema = z.infer<typeof EditMiniAppFormSchema>

interface MiniAppEditProps {
  trigger: ReactNode
  onSuccess: () => void
  miniApp: MiniApp
}

export const MiniAppEdit = (props: MiniAppEditProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const updateMiniAppMutation = reactQueryClient.useMutation('patch', '/admin/mini-app/:id')

  const defaultValues = useCallback(
    (): EditMiniAppFormSchema => ({
      name: props.miniApp.name,
      slug: props.miniApp.slug,
      url: props.miniApp.url,
      order: props.miniApp.order,
      clientId: props.miniApp.clientId,
      roles: props.miniApp.roles,
      requiresAuth: props.miniApp.requiresAuth,
      iconFile: undefined,
    }),
    [props.miniApp]
  )

  const form = useForm<EditMiniAppFormSchema>({
    resolver: standardSchemaResolver(EditMiniAppFormSchema),
    defaultValues: defaultValues(),
  })
  const elFileInput = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    if (elFileInput.current?.value) elFileInput.current.value = ''
    form.setValue('iconFile', undefined, { shouldDirty: true })
  }

  const resetForm = useCallback(() => {
    form.reset(defaultValues())
  }, [form, defaultValues])

  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<EditMiniAppFormSchema> = async ({ iconFile, ...data }) => {
    let iconFilePath: TemporaryFilePath | undefined

    if (iconFile) {
      const pngFile = await resizeImageToPng(iconFile)
      const result = await getFileUploadUrl.mutateAsync({
        body: {
          category: 'MINI_APP',
          contentType: 'image/png',
        },
      })
      await handleUploadFile(pngFile, result.uploadUrl, result.uploadFields)
      iconFilePath = result.filePath as TemporaryFilePath
    }

    const body: UpdateMiniAppBody = {
      name: data.name,
      slug: data.slug,
      url: data.url,
      order: data.order,
      clientId: data.clientId,
      roles: data.roles,
      requiresAuth: data.requiresAuth,
      iconFilePath,
    }

    await updateMiniAppMutation.mutateAsync(
      { pathParams: { id: props.miniApp.id }, body },
      {
        onSuccess: () => {
          props.onSuccess()
          setIsOpen(false)
          form.reset(defaultValues())
        },
        onError: (err) => {
          const code = err.value.error.code
          if (code === 'MINI_APP_SLUG_ALREADY_EXISTS') {
            form.setError('slug', { type: 'manual', message: 'slug นี้ถูกใช้งานแล้ว' })
          }
        },
      }
    )
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
                <Typography variant="h3">แก้ไข Mini App</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขข้อมูล Mini App
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อ Mini App" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Slug <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอก slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    URL <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>
                    ลำดับ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="0"
                      value={Number.isNaN(value) ? '' : value}
                      onChange={(ev) => onChange(ev.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client ID <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอก Client ID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roles"
              render={({ field: { onChange, value } }) => (
                <FormItem>
                  <FormLabel>บทบาทที่เข้าถึงได้</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={ROLE_OPTIONS}
                      defaultValue={value}
                      onValueChange={onChange}
                      modalPopover={true}
                      placeholder="เลือกบทบาท (ว่างไว้เพื่อเข้าถึงได้ทุกคน)"
                    />
                  </FormControl>
                  <FormMessage asChild>
                    <FormDescription>เว้นว่างไว้เพื่อให้ทุกคนเข้าถึงได้</FormDescription>
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiresAuth"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <FormLabel>ต้องเข้าสู่ระบบ</FormLabel>
                    <FormDescription>ผู้ใช้ต้องเข้าสู่ระบบก่อนใช้งาน Mini App นี้</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="iconFile"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>ไอคอน</FormLabel>
                  <div className="flex gap-2 min-w-0">
                    <FormControl>
                      <FileUploadInput
                        fileName={value?.name || props.miniApp.iconUrl}
                        preview={value || props.miniApp.iconUrl || undefined}
                      >
                        <Input
                          type="file"
                          {...field}
                          ref={(el) => {
                            elFileInput.current = el
                            ref(el)
                          }}
                          onChange={(ev) => onChange(ev.target.files?.[0])}
                          placeholder="เลือกไฟล์"
                          accept={[...ACCEPTED_IMAGE_TYPES, 'image/svg+xml'].join(',')}
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
                  {(value || props.miniApp.iconUrl) && (
                    <ImagePreview
                      className="rounded-md overflow-hidden size-20 object-cover"
                      src={value || props.miniApp.iconUrl || undefined}
                    />
                  )}
                  <FormMessage asChild>
                    <FormDescription>
                      อัปโหลดไฟล์ประเภท JPG / PNG / SVG (จะถูกแปลงเป็น PNG)
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

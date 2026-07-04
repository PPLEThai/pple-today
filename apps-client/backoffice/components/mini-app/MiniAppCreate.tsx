import { ReactNode, useRef, useState } from 'react'
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
import { Label } from '@pple-today/web-ui/label'
import { MultiSelect } from '@pple-today/web-ui/multi-select'
import { RadioGroup, RadioGroupItem } from '@pple-today/web-ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pple-today/web-ui/select'
import { Switch } from '@pple-today/web-ui/switch'
import { Typography } from '@pple-today/web-ui/typography'
import { FileUploadInput } from 'components/FileUploadInput'
import { ImagePreview } from 'components/ImagePreview'
import { Plus, X } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, handleUploadFile, MAX_FILE_SIZE } from 'utils/file-upload'
import { resizeImageToPng } from 'utils/resize-image'
import { getRoleName, ROLES } from 'utils/roles'
import z from 'zod'

import { CreateMiniAppBody, TemporaryFilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: getRoleName(role) }))

const CreateMiniAppFormSchema = z
  .object({
    name: z.string().min(1, 'กรุณากรอกชื่อ Mini App'),
    slug: z.string().min(1, 'กรุณากรอก slug'),
    url: z.url('กรุณากรอก URL ที่ถูกต้อง'),
    order: z.number().int('กรุณากรอกลำดับเป็นจำนวนเต็ม'),
    roles: z.array(z.string()),
    requiresAuth: z.boolean(),
    clientIdMode: z.enum(['auto', 'manual', 'default']),
    clientId: z.string(),
    redirectUris: z.array(z.object({ value: z.string() })),
    appType: z.enum(['OIDC_APP_TYPE_USER_AGENT', 'OIDC_APP_TYPE_WEB']),
    authMethodType: z.enum(['OIDC_AUTH_METHOD_TYPE_NONE', 'OIDC_AUTH_METHOD_TYPE_BASIC']),
    devMode: z.boolean(),
    iconFile: z
      .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
      .refine((file) => file.size <= MAX_FILE_SIZE, 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB')
      .refine(
        (file) => ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === 'image/svg+xml',
        'กรุณาอัปโหลดไฟล์ประเภท JPG / PNG / SVG'
      )
      .optional(),
  })
  .refine((data) => (data.clientIdMode === 'manual' ? !!data.clientId.trim() : true), {
    error: 'กรุณากรอก Client ID',
    path: ['clientId'],
  })
  .refine(
    (data) =>
      data.clientIdMode === 'auto'
        ? data.redirectUris.length > 0 && data.redirectUris.every((u) => !!u.value.trim())
        : true,
    {
      error: 'กรุณากรอก Redirect URI อย่างน้อย 1 รายการ',
      path: ['redirectUris'],
    }
  )

type CreateMiniAppFormSchema = z.infer<typeof CreateMiniAppFormSchema>

const deriveCallbackUri = (url: string) => {
  try {
    return new URL(url).origin + '/auth/callback'
  } catch {
    return ''
  }
}

interface MiniAppCreateProps {
  trigger: ReactNode
  onSuccess: () => void
}

export const MiniAppCreate = (props: MiniAppCreateProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')
  const createMiniAppMutation = reactQueryClient.useMutation('post', '/admin/mini-app')

  const form = useForm<CreateMiniAppFormSchema>({
    resolver: standardSchemaResolver(CreateMiniAppFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      url: '',
      order: 0,
      roles: [],
      requiresAuth: true,
      clientIdMode: 'auto',
      clientId: '',
      redirectUris: [{ value: '' }],
      appType: 'OIDC_APP_TYPE_USER_AGENT',
      authMethodType: 'OIDC_AUTH_METHOD_TYPE_NONE',
      devMode: false,
      iconFile: undefined,
    },
  })
  const elFileInput = useRef<HTMLInputElement>(null)
  const redirectUris = useFieldArray({ control: form.control, name: 'redirectUris' })

  const clientIdMode = form.watch('clientIdMode')
  const requiresAuth = form.watch('requiresAuth')

  const clearFile = () => {
    if (elFileInput.current) elFileInput.current.value = ''
    form.setValue('iconFile', undefined, { shouldDirty: true })
  }

  const handleDialogOpenChange = (state: boolean) => {
    if (!state) form.reset()
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<CreateMiniAppFormSchema> = async ({ iconFile, ...data }) => {
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

    const body: CreateMiniAppBody = {
      name: data.name,
      slug: data.slug,
      url: data.url,
      order: data.order,
      roles: data.roles,
      requiresAuth: data.requiresAuth,
      iconFilePath,
    }

    if (data.clientIdMode === 'auto') {
      body.createZitadelApp = {
        redirectUris: data.redirectUris.map((u) => u.value.trim()),
        appType: data.appType,
        authMethodType: data.authMethodType,
        devMode: data.devMode,
      }
    } else if (data.clientIdMode === 'manual') {
      body.clientId = data.clientId.trim()
    }

    await createMiniAppMutation.mutateAsync(
      { body },
      {
        onSuccess: () => {
          props.onSuccess()
          setIsOpen(false)
          form.reset()
        },
        onError: (err) => {
          const code = err.value.error.code
          if (code === 'MINI_APP_SLUG_ALREADY_EXISTS') {
            form.setError('slug', { type: 'manual', message: 'slug นี้ถูกใช้งานแล้ว' })
          } else if (code === 'MINI_APP_CLIENT_ID_REQUIRED') {
            form.setError('clientId', {
              type: 'manual',
              message: 'จำเป็นต้องระบุ Client ID สำหรับ Mini App ที่ต้องเข้าสู่ระบบ',
            })
          } else if (code === 'ZITADEL_NOT_CONFIGURED') {
            form.setError('redirectUris', { type: 'manual', message: 'ยังไม่ได้ตั้งค่า Zitadel' })
          } else if (code === 'ZITADEL_APP_CREATE_FAILED') {
            form.setError('redirectUris', {
              type: 'manual',
              message: 'สร้างแอปใน Zitadel ไม่สำเร็จ',
            })
          }
        },
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">สร้าง Mini App</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                เพิ่ม Mini App ใหม่เข้าสู่ระบบ
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
              name="clientIdMode"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="client-id-auto" />
                        <Label htmlFor="client-id-auto">สร้างใน Zitadel อัตโนมัติ</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="client-id-manual" />
                        <Label htmlFor="client-id-manual">กรอกเอง</Label>
                      </div>
                      {!requiresAuth && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="default" id="client-id-default" />
                          <Label htmlFor="client-id-default">ใช้ค่าเริ่มต้น</Label>
                        </div>
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {clientIdMode === 'default' && (
              <p className="text-sm text-base-text-medium">
                ระบบจะใช้ค่า DEFAULT_MINI_APP_CLIENT_ID เมื่อเว้น Client ID ว่างไว้ (สำหรับ Mini App
                สาธารณะ)
              </p>
            )}
            {clientIdMode === 'manual' && (
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
            )}
            {clientIdMode === 'auto' && (
              <div className="space-y-4 rounded-lg border border-base-outline-default p-3">
                <FormItem>
                  <FormLabel>
                    Redirect URIs <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <div className="space-y-2">
                    {redirectUris.fields.map((item, index) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={`redirectUris.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex gap-2 min-w-0">
                              <FormControl>
                                <Input {...field} placeholder="https://example.com/auth/callback" />
                              </FormControl>
                              {redirectUris.fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="shrink-0"
                                  onClick={() => redirectUris.remove(index)}
                                >
                                  <span className="sr-only">ลบ</span>
                                  <X className="size-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => redirectUris.append({ value: '' })}
                    >
                      <Plus className="size-4" />
                      เพิ่ม Redirect URI
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const callback = deriveCallbackUri(form.getValues('url'))
                        if (callback) form.setValue(`redirectUris.0.value`, callback)
                      }}
                    >
                      เติมจาก URL
                    </Button>
                  </div>
                  <FormMessage>{form.formState.errors.redirectUris?.root?.message}</FormMessage>
                </FormItem>
                <FormField
                  control={form.control}
                  name="appType"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>ประเภทแอป</FormLabel>
                      <FormControl>
                        <Select {...field} onValueChange={onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OIDC_APP_TYPE_USER_AGENT">
                              User Agent (SPA)
                            </SelectItem>
                            <SelectItem value="OIDC_APP_TYPE_WEB">Web</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="authMethodType"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>วิธีการยืนยันตัวตน</FormLabel>
                      <FormControl>
                        <Select {...field} onValueChange={onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OIDC_AUTH_METHOD_TYPE_NONE">None (PKCE)</SelectItem>
                            <SelectItem value="OIDC_AUTH_METHOD_TYPE_BASIC">
                              Basic (Client Secret)
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
                  name="devMode"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <FormLabel>โหมดสำหรับการพัฒนา</FormLabel>
                        <FormDescription>อนุญาต Redirect URI แบบ http</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
            <FormField
              control={form.control}
              name="iconFile"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem>
                  <FormLabel>ไอคอน</FormLabel>
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
                  {value && (
                    <ImagePreview
                      className="rounded-md overflow-hidden size-20 object-cover"
                      src={value}
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

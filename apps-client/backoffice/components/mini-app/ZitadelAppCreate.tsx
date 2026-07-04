import { ReactNode, useState } from 'react'
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Badge } from '@pple-today/web-ui/badge'
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
import { Switch } from '@pple-today/web-ui/switch'
import { Typography } from '@pple-today/web-ui/typography'
import { Copy, Plus, TriangleAlert, X } from 'lucide-react'
import z from 'zod'

import { CreateZitadelAppResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const ZitadelAppFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแอป'),
  appType: z.enum(['OIDC_APP_TYPE_USER_AGENT', 'OIDC_APP_TYPE_WEB']),
  authMethodType: z.enum(['OIDC_AUTH_METHOD_TYPE_NONE', 'OIDC_AUTH_METHOD_TYPE_BASIC']),
  devMode: z.boolean(),
  redirectUris: z
    .array(z.object({ value: z.url('กรุณากรอก URL ที่ถูกต้อง') }))
    .min(1, 'กรุณากรอก Redirect URI อย่างน้อย 1 รายการ'),
  postLogoutRedirectUris: z.array(z.object({ value: z.url('กรุณากรอก URL ที่ถูกต้อง') })),
})

type ZitadelAppFormSchema = z.infer<typeof ZitadelAppFormSchema>

interface ZitadelAppCreateProps {
  trigger: ReactNode
}

const CopyableField = ({ label, value }: { label: string; value: string }) => {
  const copy = () => {
    window.navigator.clipboard.writeText(value).catch(() => {})
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2 min-w-0">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="secondary" size="icon" className="shrink-0" onClick={copy}>
          <span className="sr-only">คัดลอก</span>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export const ZitadelAppCreate = (props: ZitadelAppCreateProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<CreateZitadelAppResponse | null>(null)

  const createZitadelAppMutation = reactQueryClient.useMutation(
    'post',
    '/admin/mini-app/zitadel-app'
  )

  const form = useForm<ZitadelAppFormSchema>({
    resolver: standardSchemaResolver(ZitadelAppFormSchema),
    defaultValues: {
      name: '',
      appType: 'OIDC_APP_TYPE_USER_AGENT',
      authMethodType: 'OIDC_AUTH_METHOD_TYPE_NONE',
      devMode: false,
      redirectUris: [{ value: '' }],
      postLogoutRedirectUris: [],
    },
  })

  const redirectUris = useFieldArray({ control: form.control, name: 'redirectUris' })
  const postLogoutRedirectUris = useFieldArray({
    control: form.control,
    name: 'postLogoutRedirectUris',
  })

  const handleDialogOpenChange = (state: boolean) => {
    if (!state) {
      form.reset()
      setResult(null)
    }
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<ZitadelAppFormSchema> = async (data) => {
    await createZitadelAppMutation.mutateAsync(
      {
        body: {
          name: data.name,
          appType: data.appType,
          authMethodType: data.authMethodType,
          devMode: data.devMode,
          redirectUris: data.redirectUris.map((u) => u.value),
          postLogoutRedirectUris: data.postLogoutRedirectUris.map((u) => u.value),
        },
      },
      {
        onSuccess: (res) => {
          setResult(res)
        },
        onError: (err) => {
          const code = err.value.error.code
          if (code === 'ZITADEL_NOT_CONFIGURED') {
            form.setError('name', { type: 'manual', message: 'ยังไม่ได้ตั้งค่า Zitadel' })
          } else if (code === 'ZITADEL_APP_CREATE_FAILED') {
            form.setError('name', { type: 'manual', message: 'สร้างแอปใน Zitadel ไม่สำเร็จ' })
          }
        },
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild>
        {result ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">สร้างแอปใน Zitadel สำเร็จ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                บันทึกข้อมูลด้านล่างก่อนปิดหน้าต่างนี้
              </DialogDescription>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-system-danger-default bg-system-danger-background p-3 text-sm text-system-danger-default">
              <TriangleAlert className="size-4 shrink-0 mt-0.5" />
              <span>
                Client Secret จะแสดงเพียงครั้งเดียวเท่านั้น
                กรุณาคัดลอกและจัดเก็บให้ปลอดภัยก่อนปิดหน้าต่างนี้
              </span>
            </div>
            <CopyableField label="App ID" value={result.appId} />
            <CopyableField label="Client ID" value={result.clientId} />
            {result.clientSecret && (
              <CopyableField label="Client Secret" value={result.clientSecret} />
            )}
            <div className="flex flex-row-reverse gap-2 mt-2">
              <Button
                type="button"
                className="flex-1 min-w-0"
                onClick={() => handleDialogOpenChange(false)}
              >
                ปิด
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Form {...form}>
              <div className="flex flex-col gap-1.5">
                <DialogTitle asChild>
                  <Typography variant="h3">สร้างแอปใน Zitadel</Typography>
                </DialogTitle>
                <DialogDescription className="text-sm text-base-text-medium leading-tight">
                  สร้างแอป OIDC ใน Zitadel เพื่อใช้ Client ID สำหรับ Mini App
                </DialogDescription>
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ชื่อแอป <span className="text-system-danger-default">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="กรอกชื่อแอป" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                <FormMessage>{form.formState.errors.redirectUris?.root?.message}</FormMessage>
              </FormItem>
              <FormItem>
                <FormLabel>Post Logout Redirect URIs</FormLabel>
                <div className="space-y-2">
                  {postLogoutRedirectUris.fields.map((item, index) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name={`postLogoutRedirectUris.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex gap-2 min-w-0">
                            <FormControl>
                              <Input {...field} placeholder="https://example.com" />
                            </FormControl>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="shrink-0"
                              onClick={() => postLogoutRedirectUris.remove(index)}
                            >
                              <span className="sr-only">ลบ</span>
                              <X className="size-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => postLogoutRedirectUris.append({ value: '' })}
                >
                  <Plus className="size-4" />
                  เพิ่ม Post Logout Redirect URI
                </Button>
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
                          <SelectItem value="OIDC_APP_TYPE_USER_AGENT">User Agent (SPA)</SelectItem>
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
                    <FormMessage asChild>
                      <FormDescription>
                        เลือก Basic เพื่อรับ Client Secret สำหรับแอปฝั่งเซิร์ฟเวอร์
                      </FormDescription>
                    </FormMessage>
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
                      <FormDescription>
                        อนุญาต Redirect URI แบบ http (สำหรับพัฒนาเท่านั้น)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {form.formState.errors.name?.type === 'manual' && (
                <Badge variant="destructive">{form.formState.errors.name.message}</Badge>
              )}
              <div className="flex flex-row-reverse gap-2 mt-2">
                <Button
                  type="submit"
                  className="flex-1 min-w-0"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'กําลังสร้าง' : 'สร้าง'}
                </Button>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="flex-1 min-w-0">
                    ยกเลิก
                  </Button>
                </DialogTrigger>
              </div>
            </Form>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

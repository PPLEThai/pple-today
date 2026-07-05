import { ReactNode, useCallback, useEffect, useState } from 'react'
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
import { Switch } from '@pple-today/web-ui/switch'
import { Typography } from '@pple-today/web-ui/typography'
import { Plus, X } from 'lucide-react'
import z from 'zod'

import { UpdateZitadelAppInput, ZitadelApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditZitadelAppFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแอป'),
  devMode: z.boolean(),
  redirectUris: z
    .array(z.object({ value: z.url('กรุณากรอก URL ที่ถูกต้อง') }))
    .min(1, 'กรุณากรอก Redirect URI อย่างน้อย 1 รายการ'),
  postLogoutRedirectUris: z.array(z.object({ value: z.url('กรุณากรอก URL ที่ถูกต้อง') })),
})

type EditZitadelAppFormSchema = z.infer<typeof EditZitadelAppFormSchema>

const shortenAppType = (appType: string) => {
  if (appType === 'OIDC_APP_TYPE_USER_AGENT') return 'User Agent (SPA)'
  if (appType === 'OIDC_APP_TYPE_WEB') return 'Web'
  return appType
}

const shortenAuthMethodType = (authMethodType: string) => {
  if (authMethodType === 'OIDC_AUTH_METHOD_TYPE_NONE') return 'None (PKCE)'
  if (authMethodType === 'OIDC_AUTH_METHOD_TYPE_BASIC') return 'Basic (Client Secret)'
  return authMethodType
}

interface ZitadelAppEditProps {
  trigger: ReactNode
  onSuccess: () => void
  zitadelApp: ZitadelApp
}

export const ZitadelAppEdit = (props: ZitadelAppEditProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const updateZitadelAppMutation = reactQueryClient.useMutation(
    'patch',
    '/admin/mini-app/zitadel-app/:appId'
  )

  const defaultValues = useCallback(
    (): EditZitadelAppFormSchema => ({
      name: props.zitadelApp.name,
      devMode: props.zitadelApp.devMode,
      redirectUris:
        props.zitadelApp.redirectUris.length > 0
          ? props.zitadelApp.redirectUris.map((value) => ({ value }))
          : [{ value: '' }],
      postLogoutRedirectUris: props.zitadelApp.postLogoutRedirectUris.map((value) => ({ value })),
    }),
    [props.zitadelApp]
  )

  const form = useForm<EditZitadelAppFormSchema>({
    resolver: standardSchemaResolver(EditZitadelAppFormSchema),
    defaultValues: defaultValues(),
  })

  const redirectUris = useFieldArray({ control: form.control, name: 'redirectUris' })
  const postLogoutRedirectUris = useFieldArray({
    control: form.control,
    name: 'postLogoutRedirectUris',
  })

  const resetForm = useCallback(() => {
    form.reset(defaultValues())
  }, [form, defaultValues])

  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<EditZitadelAppFormSchema> = async (data) => {
    const body: UpdateZitadelAppInput = {
      name: data.name,
      devMode: data.devMode,
      redirectUris: data.redirectUris.map((u) => u.value),
      postLogoutRedirectUris: data.postLogoutRedirectUris.map((u) => u.value),
    }

    await updateZitadelAppMutation.mutateAsync(
      { pathParams: { appId: props.zitadelApp.appId }, body },
      {
        onSuccess: () => {
          props.onSuccess()
          setIsOpen(false)
          form.reset(defaultValues())
        },
        onError: (err) => {
          const code = err.value.error.code
          if (code === 'ZITADEL_NOT_CONFIGURED') {
            form.setError('name', { type: 'manual', message: 'ยังไม่ได้ตั้งค่า Zitadel' })
          } else if (code === 'ZITADEL_APP_NOT_FOUND') {
            form.setError('name', { type: 'manual', message: 'ไม่พบแอปใน Zitadel' })
          } else if (code === 'ZITADEL_REQUEST_FAILED') {
            form.setError('name', { type: 'manual', message: 'เชื่อมต่อ Zitadel ไม่สำเร็จ' })
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
                <Typography variant="h3">แก้ไขแอปใน Zitadel</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขข้อมูลแอป OIDC ใน Zitadel
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
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Client ID</span>
              <Input readOnly value={props.zitadelApp.clientId} className="font-mono text-xs" />
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">ประเภทแอป</span>
                <Badge variant="outline" className="w-fit">
                  {shortenAppType(props.zitadelApp.appType)}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">วิธีการยืนยันตัวตน</span>
                <Badge variant="outline" className="w-fit">
                  {shortenAuthMethodType(props.zitadelApp.authMethodType)}
                </Badge>
              </div>
            </div>
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

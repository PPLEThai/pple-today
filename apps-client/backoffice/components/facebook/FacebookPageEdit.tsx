import { ReactNode, useCallback, useEffect, useState } from 'react'
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
import z from 'zod'

import { FacebookPage } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const EditFacebookPageFormSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเพจ'),
})

type EditFacebookPageFormSchema = z.infer<typeof EditFacebookPageFormSchema>

interface FacebookPageEditProps {
  trigger: ReactNode
  onSuccess: () => void
  facebookPage: FacebookPage
}

export const FacebookPageEdit = (props: FacebookPageEditProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const handleDialogOpenChange = (state: boolean) => {
    if (!state) resetForm()
    setIsOpen(state)
  }

  const updateFacebookPageMutation = reactQueryClient.useMutation(
    'patch',
    '/admin/facebook/:facebookPageId'
  )

  const form = useForm<EditFacebookPageFormSchema>({
    resolver: standardSchemaResolver(EditFacebookPageFormSchema),
    defaultValues: {
      name: props.facebookPage.name,
    },
  })

  const resetForm = useCallback(() => {
    form.reset({
      name: props.facebookPage.name,
    })
  }, [form, props.facebookPage.name])

  const onSubmit: SubmitHandler<EditFacebookPageFormSchema> = async (data) => {
    await updateFacebookPageMutation.mutateAsync({
      pathParams: { facebookPageId: props.facebookPage.id },
      body: data,
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
      <DialogContent asChild>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Form {...form}>
            <div className="flex flex-col gap-1.5">
              <DialogTitle asChild>
                <Typography variant="h3">แก้ไขข้อมูลเพจ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                แก้ไขชื่อเพจเฟสบุ๊ค
              </DialogDescription>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ชื่อเพจ <span className="text-system-danger-default">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="กรอกชื่อเพจ" />
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

import { ReactNode, useState } from 'react'
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

import { MiniApp } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

/**
 * Whether a Platform app's list order can be set here — the client mirror of the
 * API's `isOrderEditable`. Only a Live app that is not unlisted sits on the
 * public list, so only then does its position mean anything. Admin apps set
 * their order through the full edit form instead.
 */
export const isPlatformOrderEditable = (miniApp: MiniApp): boolean =>
  miniApp.source === 'PLATFORM' && miniApp.tier === 'LIVE' && !miniApp.unlisted

const OrderFormSchema = z.object({
  order: z.number('กรุณากรอกลำดับ').int('กรุณากรอกลำดับเป็นจำนวนเต็ม'),
})
type OrderFormSchema = z.infer<typeof OrderFormSchema>

interface MiniAppOrderEditProps {
  trigger: ReactNode
  onSuccess: () => void
  miniApp: MiniApp
}

/**
 * Set only the list order of a Platform app. The rest of the row belongs to the
 * PPLE Platform Provisioner and stays read-only; order is the one field it never
 * writes, so an admin can place a Builder App among the central team's apps.
 */
export const MiniAppOrderEdit = (props: MiniAppOrderEditProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const setOrderMutation = reactQueryClient.useMutation('put', '/admin/mini-app/:id/order')

  const form = useForm<OrderFormSchema>({
    resolver: standardSchemaResolver(OrderFormSchema),
    defaultValues: { order: props.miniApp.order },
  })

  const handleDialogOpenChange = (state: boolean) => {
    if (state) form.reset({ order: props.miniApp.order })
    setErrorMessage(null)
    setIsOpen(state)
  }

  const onSubmit: SubmitHandler<OrderFormSchema> = async ({ order }) => {
    setErrorMessage(null)
    await setOrderMutation.mutateAsync(
      { pathParams: { id: props.miniApp.id }, body: { order } },
      {
        onSuccess: () => {
          props.onSuccess()
          setIsOpen(false)
        },
        onError: (err) => {
          setErrorMessage(
            err.value.error.code === 'MINI_APP_ORDER_NOT_LISTED'
              ? 'ตั้งลำดับได้เฉพาะแอปที่ Live และไม่ได้ซ่อนจากรายการ'
              : 'บันทึกลำดับไม่สำเร็จ กรุณาลองใหม่'
          )
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
                <Typography variant="h3">ตั้งลำดับ</Typography>
              </DialogTitle>
              <DialogDescription className="text-sm text-base-text-medium leading-tight">
                ตำแหน่งของ “{props.miniApp.name}” ในรายการแอปของ PPLE Today (เลขน้อยแสดงก่อน)
                ข้อมูลอื่นของแอปจัดการผ่าน PPLE Platform
              </DialogDescription>
            </div>
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
            {errorMessage && <p className="text-sm text-system-danger-default">{errorMessage}</p>}
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

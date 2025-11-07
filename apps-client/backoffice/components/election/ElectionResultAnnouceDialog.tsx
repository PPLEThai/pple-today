import { useCallback, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Button } from '@pple-today/web-ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@pple-today/web-ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Typography } from '@pple-today/web-ui/typography'
import { DateTimePicker } from 'components/DatetimePicker'
import { Megaphone } from 'lucide-react'
import z from 'zod'

import { reactQueryClient } from '~/libs/api-client'

export default function ElectionResultAnnounceDialog({
  electionId,
  onSuccess,
  disabled,
}: {
  electionId: string
  onSuccess?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      // Pushing the change to the end of the call stack
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 0)

      return () => clearTimeout(timer)
    } else {
      document.body.style.pointerEvents = 'auto'
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2" disabled={disabled}>
          <Megaphone />
          <Typography variant="small" className="text-white">
            ประกาศผลการเลือกตั้ง
          </Typography>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle asChild>
          <Typography variant="h2">ประกาศผลการเลือกตั้ง</Typography>
        </DialogTitle>
        <ResultTimelineForm
          electionId={electionId}
          onSuccess={() => {
            onSuccess && onSuccess()
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

const ResultTimelineSchema = z.object({
  startResult: z.date().optional(),
  endResult: z.date().optional(),
})

type ResultTimelineOutput = z.infer<typeof ResultTimelineSchema>

function ResultTimelineForm({
  electionId,
  onSuccess,
}: {
  electionId: string
  onSuccess?: () => void
}) {
  const form = useForm<ResultTimelineOutput>({
    resolver: standardSchemaResolver(ResultTimelineSchema),
  })

  const announceResultMutation = reactQueryClient.useMutation(
    'put',
    '/admin/elections/:electionId/result/announce'
  )

  const announceResult = useCallback(
    ({ startResult, endResult }: { startResult: Date; endResult: Date }) => {
      if (announceResultMutation.isPending) return

      announceResultMutation.mutateAsync(
        {
          pathParams: {
            electionId,
          },
          body: {
            start: startResult,
            end: endResult,
          },
        },
        {
          onSuccess,
        }
      )
    },
    [announceResultMutation, electionId, onSuccess]
  )

  const onSubmit: SubmitHandler<ResultTimelineOutput> = (
    data: z.infer<typeof ResultTimelineSchema>
  ) => {
    if (!data.startResult || !data.endResult) return

    const now = new Date()
    if (data.startResult >= data.endResult) {
      form.setError('startResult', {
        type: 'manual',
        message: 'วันที่เริ่มประกาศผล ต้องอยู่ก่อนหน้าวันที่สิ้นสุดการประกาศผล',
      })
      return
    }
    if (data.startResult < now) {
      form.setError('startResult', {
        type: 'manual',
        message: 'วันที่เริ่มประกาศผล ต้องไม่เป็นวันที่ผ่านมาแล้ว',
      })
      return
    }

    announceResult({ startResult: data.startResult, endResult: data.endResult })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-96">
      <Form {...form}>
        <FormField
          control={form.control}
          name="startResult"
          render={({ field }) => (
            <FormItem>
              <FormLabel>วันเริ่มต้นประกาศผล</FormLabel>
              <DateTimePicker {...field} className="w-full" />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endResult"
          render={({ field }) => (
            <FormItem>
              <FormLabel>วันสิ้นสุดประกาศผล</FormLabel>
              <DateTimePicker {...field} className="w-full" />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4 justify-end">
          <DialogTrigger asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogTrigger>
          <Button
            disabled={
              announceResultMutation.isPending ||
              !form.watch().endResult ||
              !form.watch().startResult
            }
          >
            ประกาศ
          </Button>
        </div>
      </Form>
    </form>
  )
}

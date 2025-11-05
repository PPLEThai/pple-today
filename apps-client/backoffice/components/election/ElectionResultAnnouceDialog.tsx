import 'react-datepicker/dist/react-datepicker.css'

import { useCallback } from 'react'
import DatePicker from 'react-datepicker'
import { SubmitHandler, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema/src/standard-schema.js'
import { Button } from '@pple-today/web-ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@pple-today/web-ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Typography } from '@pple-today/web-ui/typography'
import { Megaphone } from 'lucide-react'
import z from 'zod'

import { reactQueryClient } from '~/libs/api-client'

export default function ElectionResultAnnouceDialog({
  electionId,
  onSuccess,
}: {
  electionId: string
  onSuccess?: () => void
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
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
        <ResultTimelineForm electionId={electionId} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

const ResultTimelineSchema = z.object({
  startResult: z.date().nullable(),
  endResult: z.date().nullable(),
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
    defaultValues: {
      startResult: null,
      endResult: null,
    },
  })

  const annouceResultMutation = reactQueryClient.useMutation(
    'put',
    '/admin/elections/:electionId/result/annouce'
  )

  const annouceResult = useCallback(
    ({ startResult, endResult }: { startResult: Date; endResult: Date }) => {
      if (annouceResultMutation.isPending) return

      annouceResultMutation.mutateAsync(
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
    [annouceResultMutation, electionId, onSuccess]
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

    annouceResult({ startResult: data.startResult, endResult: data.endResult })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Form {...form}>
        <FormField
          control={form.control}
          name="startResult"
          render={({ field }) => (
            <FormItem>
              <FormLabel>วันเริ่มต้นประกาศผล</FormLabel>
              <DatePicker
                selected={field.value}
                onChange={field.onChange}
                className="border-2 p-2 rounded-md"
                placeholderText="เลือกวันที่"
              />
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
              <DatePicker
                selected={field.value}
                onChange={field.onChange}
                className="border-2 p-2 rounded-md"
                placeholderText="เลือกวันที่"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4 justify-end">
          <DialogTrigger asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogTrigger>
          <Button>ประกาศ</Button>
        </div>
      </Form>
    </form>
  )
}

import { ReactNode, useEffect, useState } from 'react'
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
import { Form } from '@pple-today/web-ui/form'
import { Typography } from '@pple-today/web-ui/typography'
import { MaybePromise } from 'utils/promise'
import z from 'zod'

import { ElectionEligibleVoterForm } from './ElectionEligibleVoterForm'
import { ElectionGeneralInfoForm } from './ElectionGeneralInfoForm'
import { ElectionFormSchema } from './models'

export const ElectionEditGeneralInfoFormSchema = ElectionFormSchema.omit({
  candidates: true,
  isCandidateHasNumber: true,
})

export type ElectionEditGeneralInfoFormValues = z.infer<typeof ElectionEditGeneralInfoFormSchema>

interface ElectionEditGeneralInfoFormProps {
  defaultValues: ElectionEditGeneralInfoFormValues
  setIsOpen: (isOpen: boolean) => void
  onSuccess: (data: ElectionEditGeneralInfoFormValues) => MaybePromise<void>
}

export const ElectionEditGeneralInfoForm = (props: ElectionEditGeneralInfoFormProps) => {
  const form = useForm<ElectionEditGeneralInfoFormValues>({
    resolver: standardSchemaResolver(ElectionEditGeneralInfoFormSchema),
    defaultValues: props.defaultValues ?? {
      name: '',
      eligibleVoterFile: null,
    },
  })

  const onSubmit: SubmitHandler<ElectionEditGeneralInfoFormValues> = async (data) => {
    await props.onSuccess(data)
    props.setIsOpen(false)
  }

  return (
    <>
      <DialogTitle asChild>
        <Typography variant="h3">แก้ไขรายละเอียดการเลือกตั้ง</Typography>
      </DialogTitle>
      <DialogDescription className="text-sm text-base-text-medium leading-tight">
        แก้ไขรายละเอียดการเลือกตั้งสำหรับลงคะแนนภายในพรรค
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Form {...form}>
          <ElectionGeneralInfoForm isAbleToChangeMode={props.defaultValues?.mode === 'FLEXIBLE'} />
          <div className="my-4 border border-base-bg-default" />
          <ElectionEligibleVoterForm />
          <div className="flex flex-row-reverse gap-2 mt-2">
            <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
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
    </>
  )
}

interface ElectionEditGeneralInfoProps {
  trigger: ReactNode
  defaultValues: ElectionEditGeneralInfoFormValues
  onSuccess: (data: ElectionEditGeneralInfoFormValues) => MaybePromise<void>
}

export const ElectionEditGeneralInfo = (props: ElectionEditGeneralInfoProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pushing the change to the end of the call stack
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 0)

      return () => clearTimeout(timer)
    } else {
      document.body.style.pointerEvents = 'auto'
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild cardClassName="max-w-3xl">
        <ElectionEditGeneralInfoForm
          setIsOpen={setIsOpen}
          onSuccess={props.onSuccess}
          defaultValues={props.defaultValues}
        />
      </DialogContent>
    </Dialog>
  )
}

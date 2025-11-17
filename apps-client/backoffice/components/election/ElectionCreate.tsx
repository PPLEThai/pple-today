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

import { ElectionCandidateForm } from './ElectionCandidateForm'
import { ElectionEligibleVoterForm } from './ElectionEligibleVoterForm'
import { ElectionGeneralInfoForm } from './ElectionGeneralInfoForm'
import { ElectionFormSchema, ElectionFormValues } from './models'

interface ElectionCreateFormProps {
  setIsOpen: (isOpen: boolean) => void
  onSuccess: (data: ElectionFormValues) => void | Promise<void>
}

export const ElectionCreateForm = (props: ElectionCreateFormProps) => {
  const form = useForm<ElectionFormValues>({
    resolver: standardSchemaResolver(ElectionFormSchema),
    defaultValues: {
      name: '',
      eligibleVoterFile: null,
      candidates: [],
    },
  })

  const onSubmit: SubmitHandler<ElectionFormValues> = async (data) => {
    await props.onSuccess(data)
    props.setIsOpen(false)
  }

  return (
    <>
      <DialogTitle asChild>
        <Typography variant="h3">สร้างการเลือกตั้ง</Typography>
      </DialogTitle>
      <DialogDescription className="text-sm text-base-text-medium leading-tight">
        สร้างการเลือกตั้งสำหรับลงคะแนนภายในพรรค
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Form {...form}>
          <div className="max-h-[60vh] px-2 overflow-auto">
            <div className="space-y-4">
              <ElectionGeneralInfoForm />
              <div className="my-4 border border-base-bg-default" />
              <ElectionEligibleVoterForm />
              <div className="my-4 border border-base-bg-default" />
              <ElectionCandidateForm />
            </div>
          </div>
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

interface ElectionCreateProps {
  trigger: ReactNode
  onSuccess: (data: ElectionFormValues) => Promise<void> | void
}

export const ElectionCreate = (props: ElectionCreateProps) => {
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
        <ElectionCreateForm setIsOpen={setIsOpen} onSuccess={props.onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

import { useRef } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { Button } from '@pple-today/web-ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { RadioGroup, RadioGroupItem } from '@pple-today/web-ui/radio-group'
import { Typography } from '@pple-today/web-ui/typography'
import { cn } from '@pple-today/web-ui/utils'
import { FileUploadInput } from 'components/FileUploadInput'
import { CirclePlus, X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES } from 'utils/file-upload'

import { ElectionFormValues } from './models'

interface ElectionCandidateFormProps {
  showTitle?: boolean
}

export const ElectionCandidateForm = ({ showTitle }: ElectionCandidateFormProps) => {
  const form = useFormContext<Pick<ElectionFormValues, 'candidates' | 'isCandidateHasNumber'>>()
  const candidates = useFieldArray({
    control: form.control,
    name: 'candidates',
  })

  const isCandidateHasNumber = form.watch('isCandidateHasNumber')

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="space-y-1">
          <Typography variant="h6">
            ผู้ลงสมัคร <span className="text-system-danger-default">*</span>
          </Typography>
          <Typography variant="small" className="text-base-text-placeholder mb-4">
            กรุณาสร้างอย่างน้อย 2 ตัวเลือก
          </Typography>
        </div>
      )}
      <FormField
        control={form.control}
        name="isCandidateHasNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              ผู้สมัครมีหมายเลขประจําตัวหรือไม่?{' '}
              <span className="text-system-danger-default">*</span>
            </FormLabel>
            <RadioGroup
              onValueChange={(value) => field.onChange(value === 'true')}
              value={field.value === undefined ? undefined : field.value ? 'true' : 'false'}
              className="flex flex-row gap-8 mt-2"
            >
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <RadioGroupItem value="true" />
                </FormControl>
                <FormLabel>มีหมายเลขประจําตัว</FormLabel>
              </FormItem>
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <RadioGroupItem value="false" />
                </FormControl>
                <FormLabel>ไม่มีหมายเลขประจําตัว</FormLabel>
              </FormItem>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="candidates"
        render={() => (
          <>
            {candidates.fields.map((field, index) => (
              <div
                key={field.id}
                className="border border-base-border-light bg-base-bg-light rounded-md p-4 mb-4 space-y-4"
              >
                <div className="flex gap-4">
                  {isCandidateHasNumber && (
                    <FormField
                      control={form.control}
                      name={`candidates.${index}.number`}
                      render={({ field }) => (
                        <FormItem className="basis-1/4 self-baseline">
                          <FormLabel>
                            หมายเลขผู้สมัคร <span className="text-system-danger-default">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              placeholder="กรอกหมายเลขผู้สมัคร"
                              onChange={(ev) => {
                                field.onChange(ev.currentTarget.valueAsNumber)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name={`candidates.${index}.name`}
                    render={({ field }) => (
                      <FormItem
                        className={cn(
                          isCandidateHasNumber ? 'basis-3/4' : 'basis-full',
                          'self-baseline'
                        )}
                      >
                        <FormLabel>
                          ชื่อผู้สมัคร <span className="text-system-danger-default">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="กรอกชื่อผู้สมัคร" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`candidates.${index}.imageFile`}
                  render={({ field: { onChange, value, ref, ...field } }) => {
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const fieldRef = useRef<HTMLInputElement | null>(null)

                    return (
                      <div className="flex items-center gap-2">
                        <FileUploadInput
                          fileName={
                            value.type === 'NO_FILE'
                              ? null
                              : value.type === 'OLD_FILE'
                                ? value.filePath
                                : value.file.name
                          }
                          preview={
                            value.type === 'NO_FILE'
                              ? undefined
                              : value.type === 'OLD_FILE'
                                ? value.url
                                : value.file
                          }
                        >
                          <Input
                            type="file"
                            {...field}
                            placeholder="เลือกไฟล์"
                            accept={ACCEPTED_FILE_TYPES.join(',')}
                            ref={(el) => {
                              fieldRef.current = el
                              ref(el)
                            }}
                            onChange={(ev) => {
                              if (!ev.target.files || ev.target.files.length === 0) return
                              onChange({
                                type: 'NEW_FILE',
                                file: ev.target.files[0],
                              })
                            }}
                          />
                        </FileUploadInput>
                        {value.type !== 'NO_FILE' && (
                          <Button
                            className="shrink-0"
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => {
                              if (fieldRef.current) fieldRef.current.value = ''
                              onChange({
                                type: 'NO_FILE',
                              })
                            }}
                          >
                            <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                            <X className="size-6" />
                          </Button>
                        )}
                      </div>
                    )
                  }}
                />
                <Button size="sm" className="w-full" onClick={() => candidates.remove(index)}>
                  ลบผู้สมัคร
                </Button>
              </div>
            ))}
            <FormMessage className="text-center" />
            <Button
              variant="outline"
              type="button"
              className="w-full border-dashed gap-2 text-base-secondary-light"
              onClick={() =>
                candidates.append({
                  id: `new-added-${Math.random().toString(36).substring(2, 15)}`,
                  name: '',
                  imageFile: {
                    type: 'NO_FILE',
                  },
                })
              }
            >
              <CirclePlus width={16} height={16} />
              เพิ่มผู้สมัคร
            </Button>
          </>
        )}
      />
    </div>
  )
}

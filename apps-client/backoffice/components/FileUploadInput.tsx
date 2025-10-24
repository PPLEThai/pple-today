import { ComponentProps, PropsWithChildren } from 'react'

import { cn } from '@pple-today/web-ui/utils'

const trimFilePath = (path: string) => path.substring(path.lastIndexOf('/') + 1)
const createFilePreview = (file: File) => URL.createObjectURL(file)

interface FileUploadInputProps {
  fileName?: string | null
  preview?: string | File
}

const FILENAME_PROPS: ComponentProps<'span'> & ComponentProps<'a'> = {
  className: 'min-w-0 mr-auto truncate leading-tight',
  dir: 'rtl',
}

export const FileUploadInput = ({
  fileName,
  preview,
  children,
}: PropsWithChildren<FileUploadInputProps>) => {
  return (
    <label className="flex-1 min-w-0 flex items-center gap-2 py-2.5 px-3 w-full bg-base-bg-white border border-base-bg-medium rounded-lg text-sm text-base-text-high cursor-pointer">
      <div className="hidden">{children}</div>
      <span className="font-semibold leading-5 whitespace-nowrap">เลือกไฟล์</span>
      {fileName && preview ? (
        <a
          href={typeof preview === 'string' ? preview : createFilePreview(preview)}
          target="_blank"
          rel="noreferrer"
          {...FILENAME_PROPS}
          className={cn(FILENAME_PROPS.className, 'hover:underline')}
        >
          {trimFilePath(fileName)}
        </a>
      ) : (
        <span {...FILENAME_PROPS}>{fileName ? trimFilePath(fileName) : 'ยังไม่ได้เลือกไฟล์'}</span>
      )}
    </label>
  )
}

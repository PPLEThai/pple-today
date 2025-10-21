import { PropsWithChildren } from 'react'

const trimFilePath = (path: string | null | undefined) => {
  if (!path) return path
  return path.substring(path.lastIndexOf('/') + 1)
}

interface FileUploadInputProps {
  fileName?: string | null
}

export const FileUploadInput = ({
  fileName,
  children,
}: PropsWithChildren<FileUploadInputProps>) => {
  return (
    <label className="flex-1 min-w-0 flex items-center gap-2 py-2.5 px-3 w-full bg-base-bg-white border border-base-bg-medium rounded-lg text-sm text-base-text-high cursor-pointer">
      <div className="hidden">{children}</div>
      <span className="font-semibold leading-5 whitespace-nowrap">เลือกไฟล์</span>
      <span className="min-w-0 mr-auto truncate leading-tight" dir="rtl">
        {fileName ? trimFilePath(fileName) : 'ยังไม่ได้เลือกไฟล์'}
      </span>
    </label>
  )
}

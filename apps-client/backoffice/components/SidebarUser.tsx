import { PropsWithChildren } from 'react'

interface SidebarUserProps {
  src: string
  title: string
  subtitle: string
}

export const SidebarUser = ({
  src,
  title,
  subtitle,
  children,
}: PropsWithChildren<SidebarUserProps>) => {
  return (
    <div className="flex items-center gap-2 p-2">
      <img className="size-8 shrink-0 rounded-lg" src={src} alt="" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="text-sm font-medium text-base-text-high">{title}</div>
        <div className="text-xs font-light text-base-text-medium">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

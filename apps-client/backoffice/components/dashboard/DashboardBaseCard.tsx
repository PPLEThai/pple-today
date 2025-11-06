import React, { PropsWithChildren } from 'react'

import { cn } from '@pple-today/web-ui/utils'
import { LucideProps } from 'lucide-react'

export interface DashboardBaseCardProps {
  title: string
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >
  className?: string
  titleExtension?: React.ReactNode
}

export const DashboardBaseCard = (props: PropsWithChildren<DashboardBaseCardProps>) => {
  return (
    <article
      className={cn(
        'relative flex flex-col gap-[18px] p-4 border border-base-outline-default rounded-xl',
        props.className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h2 className="font-semibold text-base-text-medium text-base/6">{props.title}</h2>
          {props.titleExtension}
        </div>
        <div className="shrink-0 size-10 p-2 rounded-xl bg-base-primary-extra-light">
          <props.icon className="stroke-base-primary-default" size={24} strokeWidth={2} />
        </div>
      </div>
      {props.children}
    </article>
  )
}

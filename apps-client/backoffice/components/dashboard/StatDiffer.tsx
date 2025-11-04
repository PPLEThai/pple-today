import { Skeleton } from '@pple-today/web-ui/skeleton'
import { cn } from '@pple-today/web-ui/utils'
import { MoveRight, TrendingDown, TrendingUp } from 'lucide-react'

interface StatDifferProps {
  isLoading?: boolean
  old: number
  new: number
}

export const StatDiffer = (props: StatDifferProps) => {
  const percentage = (props.new / (props.old || 1) - 1) * 100

  return props.isLoading ? (
    <Skeleton className="w-full max-w-[16ch] h-6" />
  ) : (
    <div className="flex items-center gap-2">
      {percentage === 0 ? (
        <MoveRight className="shrink-0 size-5 stroke-base-text-medium" />
      ) : percentage > 0 ? (
        <TrendingUp className="shrink-0 size-5 stroke-system-success-default" />
      ) : (
        <TrendingDown className="shrink-0 size-5 stroke-system-danger-default" />
      )}
      <span className="flex items-baseline gap-1 font-semibold leading-6 text-base-text-medium">
        <span
          className={cn(
            percentage === 0
              ? ''
              : percentage > 0
                ? 'text-system-success-default'
                : 'text-system-danger-default'
          )}
        >
          {percentage.toLocaleString('th')}%
        </span>
        <span>จากเมื่อวาน</span>
      </span>
    </div>
  )
}

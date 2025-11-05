import { Skeleton } from '@pple-today/web-ui/skeleton'

import { DashboardBaseCard, DashboardBaseCardProps } from './DashboardBaseCard'
import { StatDiffer } from './StatDiffer'

export interface DashboardStatCardProps extends DashboardBaseCardProps {
  displayValue: number
  trendOldValue: number
  trendNewValue: number
  isLoading: boolean
}

export const DashboardStatCard = ({
  displayValue,
  trendOldValue,
  trendNewValue,
  isLoading,
  titleExtension: _,
  ...dashboardBaseCardProps
}: DashboardStatCardProps) => {
  return (
    <DashboardBaseCard
      {...dashboardBaseCardProps}
      titleExtension={
        isLoading ? (
          <Skeleton className="w-full text-3xl/9 max-w-[6ch] h-9" />
        ) : (
          <span className="text-3xl/9 font-semibold">{displayValue.toLocaleString('th')}</span>
        )
      }
    >
      <StatDiffer new={trendNewValue} old={trendOldValue} isLoading={isLoading} />
    </DashboardBaseCard>
  )
}

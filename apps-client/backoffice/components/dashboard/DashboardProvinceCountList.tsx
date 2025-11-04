const UNKNOWN_PROVINCE_KEY = 'Unknown'

interface DashboardProvinceCountListProps {
  data: Record<string, number>
}

export const DashboardProvinceCountList = (props: DashboardProvinceCountListProps) => {
  const formattedData = Object.entries(props.data)
    .map(([province, count]) => ({
      province: province === UNKNOWN_PROVINCE_KEY ? 'ไม่ระบุ' : province,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return formattedData.length > 0 ? (
    <div className="overflow-y-auto -mr-4 [scrollbar-gutter:stable] [scrollbar-color:#E2E8F0_transparent]">
      <dl className="flex flex-col gap-2">
        {formattedData.map((d) => (
          <div key={d.province} className="flex gap-2 py-1 border-b border-b-base-outline-default">
            <dt className="flex-1 min-w-0 truncate font-semibold leading-6 text-base-text-medium">
              {d.province}
            </dt>
            <dd className="shrink-0 w-max whitespace-nowrap font-semibold leading-6 text-base-text-high">
              {d.count}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  ) : (
    <p className="font-semibold leading-6 text-base-text-medium text-center">ไม่มีข้อมูล</p>
  )
}

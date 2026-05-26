import { BannerInAppType } from '@api/backoffice/admin'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { BANNER_IN_APP_TYPE_VALUES } from '~/utils/in-app-navigation-types'
import { mapInAppNavigationTypeToLabel } from '~/utils/link'

type BannerInAppTypeSelectProps = {
  value?: string
  onValueChange: (value: string) => void
}

export function BannerInAppTypeSelect({ value, onValueChange }: BannerInAppTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="เลือกประเภทเนื้อหาในแอป" />
      </SelectTrigger>
      <SelectContent>
        {BANNER_IN_APP_TYPE_VALUES.map((inAppType) => (
          <SelectItem key={inAppType} value={inAppType}>
            {mapInAppNavigationTypeToLabel(inAppType as BannerInAppType)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

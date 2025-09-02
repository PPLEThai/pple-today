import { AvatarFallback } from '@pple-today/ui/avatar'
import { Icon } from '@pple-today/ui/icon'

import PPLEIcon from '@app/assets/pple-icon.svg'

export function AvatarPPLEFallback() {
  return (
    <AvatarFallback className="w-full h-full rounded-full bg-base-primary-default flex items-center justify-center overflow-hidden">
      <Icon icon={PPLEIcon} className="text-white mt-[10%]" width="50%" height="50%" />
    </AvatarFallback>
  )
}

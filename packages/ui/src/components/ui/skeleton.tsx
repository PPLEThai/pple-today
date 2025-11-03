import { View } from 'react-native'

import { cn } from '../../lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('bg-base-bg-default rounded-md', className)} {...props} />
}

export { Skeleton }

import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, LucideIcon } from 'lucide-react-native'

interface HeaderProps {
  icon: LucideIcon
  title: string
  onBack?: () => void
}

export function Header(props: HeaderProps) {
  const router = useRouter()

  return (
    <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default">
      <Button
        variant="outline-primary"
        size="icon"
        onPress={() => {
          router.back()
          props.onBack?.()
        }}
        aria-label="กลับ"
      >
        <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
      </Button>
      <View className="inline-flex flex-row justify-center gap-2 items-center">
        <Icon icon={props.icon} size={32} className="text-base-primary-default align-middle" />
        <H1 className="font-heading-semibold text-2xl text-base-text-high">{props.title}</H1>
      </View>
    </View>
  )
}

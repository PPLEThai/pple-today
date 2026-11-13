import { View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { LucideIcon } from 'lucide-react-native'

import { BackButton } from '@app/components/back-button'

interface HeaderProps {
  icon: LucideIcon
  title: string
  onBack?: () => void
}

export function Header(props: HeaderProps) {
  const router = useRouter()

  return (
    <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default">
      <BackButton
        onPress={() => {
          router.back()
          props.onBack?.()
        }}
        aria-label="กลับ"
      />
      <View className="inline-flex flex-row justify-center gap-2 items-center">
        <Icon icon={props.icon} size={32} className="text-base-primary-default align-middle" />
        <H1 className="font-heading-semibold text-2xl text-base-text-high">{props.title}</H1>
      </View>
    </View>
  )
}

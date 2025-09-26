import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, LucideIcon } from 'lucide-react-native'

interface HeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onBack?: () => void
}

export function PageHeader(props: HeaderProps) {
  const router = useRouter()

  return (
    <View className="p-4 pt-safe-offset-4 flex flex-row justify-between items-center bg-base-bg-white">
      <Button
        variant="outline-primary"
        size="icon"
        onPress={() => {
          router.back()
        }}
        aria-label="กลับ"
      >
        <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
      </Button>
      <View className="flex flex-col gap-1 items-end">
        <View className="inline-flex flex-row justify-center gap-2 items-center">
          <Icon icon={props.icon} size={32} className="text-base-primary-default align-middle" />
          <H1 className="font-heading-semibold text-3xl text-base-primary-default">
            {props.title}
          </H1>
        </View>
        {props.subtitle && (
          <Text className="text-base-text-medium text-base font-heading-regular">
            {props.subtitle}
          </Text>
        )}
      </View>
    </View>
  )
}

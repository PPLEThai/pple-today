import { View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, UserIcon } from 'lucide-react-native'

import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'

export default function ProfilePage() {
  const router = useRouter()

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="bg-base-bg-white pb-4">
        <View className="pt-safe-offset-4 px-4 pb-4">
          <Button
            variant="outline-primary"
            size="icon"
            onPress={() => router.back()}
            aria-label="Go back"
          >
            <Icon icon={ArrowLeftIcon} size={24} />
          </Button>
        </View>
        <View className="w-full flex flex-col">
          <View className="flex flex-row items-center gap-4 px-4 pb-4">
            {/* Avatar */}
            <Avatar alt={'ปกรณ์ พิมพ์โคตร'} className="w-16 h-16">
              <AvatarImage source={{ uri: 'https://example.com/avatar.jpg' }} />
              <AvatarPPLEFallback />
            </Avatar>
            {/* Name and Location */}
            <View>
              <Text className="text-base-text-default text-lg font-heading-bold">
                ปกรณ์ พิมพ์โคตร
              </Text>
              <View className="flex flex-row items-center gap-3">
                <Badge>
                  <Text>สส.พรรคประชาชน</Text>
                </Badge>
                <View className="flex flex-row gap-1 items-center">
                  <Icon
                    icon={UserIcon}
                    size={20}
                    className="text-base-primary-default"
                    strokeWidth={1.5}
                  />
                  <Text>{148}</Text>
                </View>
              </View>
            </View>
          </View>
          {/* Following Button */}
          <Button className="mx-4" size={'sm'}>
            <Text>ติดตาม</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}

import { View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { Image } from 'expo-image'
import { BellIcon, LayoutGridIcon } from 'lucide-react-native'

import { PushSenderApp } from '@app/utils/branded-push'

/** The label PPLE Today's own notifications carry where an app would be named. */
export const PLATFORM_SENDER_NAME = 'แจ้งเตือนทั่วไป'

/**
 * The avatar at the head of a notification: the icon of the app that sent it, or
 * PPLE Today's bell for its own.
 *
 * The icon is rendered straight from `iconUrl` rather than through
 * `createImageUrl`, because a legacy `MiniApp.icon` may be a base64 data URI —
 * which React Native renders fine, but which the image server's query parameters
 * would corrupt.
 */
export function NotificationSenderIcon({
  app,
  size = 32,
  shape = 'circle',
}: {
  /** The sending app, or absent for one of PPLE Today's own notifications. */
  app?: PushSenderApp
  size?: number
  /**
   * The frame the app's *own* artwork is cropped to. An app icon is drawn as a
   * square, so a circle cuts its corners off — `rounded-square` shows it the way
   * its designer drew it and the way every launcher does. The platform bell and
   * the no-icon app mark below are glyphs rather than artwork; they stay
   * circular whatever this says, so a branded row is the only one that changes
   * shape.
   */
  shape?: 'circle' | 'rounded-square'
}) {
  if (app?.iconUrl) {
    return (
      <Image
        source={{ uri: app.iconUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : size / 4,
        }}
        contentFit="cover"
        accessibilityLabel={app.name}
      />
    )
  }
  return (
    <View
      className="rounded-full bg-base-primary-default flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* An app that has no icon yet still must not borrow the platform's bell —
          that would read as PPLE Today having sent the notification. */}
      <Icon icon={app ? LayoutGridIcon : BellIcon} className="text-base-bg-white" size={size / 2} />
    </View>
  )
}

import type { StyleProp, ViewStyle } from 'react-native'

export interface ExpoScrollForwarderViewProps {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  scrollViewTag: number | null
}

import { Platform } from 'react-native'

import { isLiquidGlassAvailable } from 'expo-glass-effect'

/**
 * iOS 26 draws native bars (tab bar, navigation bar) with Liquid Glass. Only
 * there do we hand those bars to UIKit; Android and older iOS keep the JS bars,
 * so their design is unchanged.
 *
 * Same check expo-router uses to pick the transparent glass header, so our
 * layout always matches the header it draws.
 */
export const supportsLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable()

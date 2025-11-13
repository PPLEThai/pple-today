import { PixelRatio } from 'react-native'

export const createImageUrl = (
  url: string,
  config: { width?: number; height?: number; quality?: number }
): string => {
  if (!url) return url

  const urlObj = new URL(url)

  urlObj.searchParams.set('quality', config.quality?.toString() ?? '80')

  if (!config.width && !config.height) {
    return urlObj.toString()
  }

  if (config.width) {
    urlObj.searchParams.set('width', PixelRatio.getPixelSizeForLayoutSize(config.width).toString())
  }
  if (config.height) {
    urlObj.searchParams.set(
      'height',
      PixelRatio.getPixelSizeForLayoutSize(config.height).toString()
    )
  }
  return urlObj.toString()
}

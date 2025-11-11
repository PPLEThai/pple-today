import { PixelRatio } from 'react-native'

export const createImageUrl = (
  url: string,
  config: { width?: number; height?: number; quality?: number }
): string => {
  if (!url) return url

  const urlObj = new URL(url)

  if (!config.width && !config.height) {
    return urlObj.toString()
  }

  if (config.width) {
    urlObj.searchParams.append(
      'width',
      PixelRatio.getPixelSizeForLayoutSize(config.width).toString()
    )
  }
  if (config.height) {
    urlObj.searchParams.append(
      'height',
      PixelRatio.getPixelSizeForLayoutSize(config.height).toString()
    )
  }
  urlObj.searchParams.append('quality', config.quality?.toString() ?? '80')

  return urlObj.toString()
}

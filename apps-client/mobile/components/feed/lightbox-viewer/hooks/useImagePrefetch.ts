/**
 * Copyright (c) JOB TODAY S.A. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useEffect } from 'react'
import { Image } from 'react-native'

import { ImageSource } from '../@types'

const useImagePrefetch = (images: ImageSource[]) => {
  useEffect(() => {
    images.forEach((image) => {
      //@ts-expect-error Property 'uri' does not exist on type 'ImageSource'.
      if (image.uri) {
        //@ts-expect-error Property 'uri' does not exist on type 'ImageSource'.
        return Image.prefetch(image.uri)
      }
    })
  }, [])
}

export default useImagePrefetch

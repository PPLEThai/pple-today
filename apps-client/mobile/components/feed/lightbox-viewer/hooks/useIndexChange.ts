/**
 * Copyright (c) JOB TODAY S.A. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import { Dimensions } from '../@types'

const useIndexChange = (imageIndex: number, screen: Dimensions) => {
  const [currentIndex, setIndex] = useState(imageIndex)
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {
      nativeEvent: {
        contentOffset: { x: scrollX },
      },
    } = event

    if (screen.width) {
      const nextIndex = Math.round(scrollX / screen.width)
      setIndex(nextIndex < 0 ? 0 : nextIndex)
    }
  }

  return [currentIndex, onScroll] as const
}

export default useIndexChange

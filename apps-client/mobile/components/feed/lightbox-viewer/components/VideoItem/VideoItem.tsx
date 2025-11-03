/**
 * Copyright (c) JOB TODAY S.A. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, { useEffect, useRef } from 'react'
import { Dimensions, ScrollView, StyleSheet } from 'react-native'

import { useVideoPlayer, VideoSource, VideoView } from 'expo-video'

const SCREEN = Dimensions.get('window')
const SCREEN_WIDTH = SCREEN.width
const SCREEN_HEIGHT = SCREEN.height

interface VideoItemRef {
  pause: () => void
}
type Props = {
  index: number
  currentIndex: number
  videoSrc: VideoSource
  ref?: VideoItemRef
}

const VideoItem = ({ videoSrc, currentIndex, index }: Props) => {
  const imageContainer = useRef<ScrollView>(null)
  const player = useVideoPlayer(videoSrc, (player) => {
    player.loop = true
  })

  useEffect(() => {
    if (currentIndex === index) {
      player.play()
    } else {
      player.pause()
    }
  }, [currentIndex, index, player])

  return (
    <ScrollView
      ref={imageContainer}
      style={styles.listItem}
      pagingEnabled
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.imageScrollContainer}
    >
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        fullscreenOptions={{ enable: true }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  listItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageScrollContainer: {
    height: SCREEN_HEIGHT,
  },
})

export default React.memo(VideoItem)

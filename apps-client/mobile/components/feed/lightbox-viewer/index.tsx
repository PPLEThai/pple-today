/**
 * Copyright (c) JOB TODAY S.A. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, { ComponentType, useCallback, useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  ModalProps,
  StyleSheet,
  View,
  VirtualizedList,
} from 'react-native'

import { VideoSource } from 'expo-video'

import { ImageSource } from './@types'
import ImageDefaultHeader from './components/ImageDefaultHeader'
import ImageItem from './components/ImageItem/ImageItem'
import StatusBarManager from './components/StatusBarManager'
import VideoItem from './components/VideoItem/VideoItem'
import useAnimatedComponents from './hooks/useAnimatedComponents'
import useIndexChange from './hooks/useIndexChange'
import useRequestClose from './hooks/useRequestClose'

export type LightboxSource =
  | {
      type: 'IMAGE'
      src: ImageSource
    }
  | {
      type: 'VIDEO'
      src: VideoSource
    }

type Props = {
  sources: LightboxSource[]
  keyExtractor?: (src: LightboxSource, index: number) => string
  index: number
  visible: boolean
  onRequestClose: () => void
  // onLongPress?: (src: Source) => void
  onLongPress?: () => void
  onIndexChange?: (imageIndex: number) => void
  presentationStyle?: ModalProps['presentationStyle']
  animationType?: ModalProps['animationType']
  backgroundColor?: string
  swipeToCloseEnabled?: boolean
  doubleTapToZoomEnabled?: boolean
  delayLongPress?: number
  HeaderComponent?: ComponentType<{ imageIndex: number }>
  FooterComponent?: ComponentType<{ imageIndex: number }>
}

const DEFAULT_ANIMATION_TYPE = 'fade'
const DEFAULT_PRESENTATION_STYLE = 'overFullScreen'
const DEFAULT_BG_COLOR = '#000'
const DEFAULT_DELAY_LONG_PRESS = 800
const SCREEN = Dimensions.get('screen')
const SCREEN_WIDTH = SCREEN.width

function LightboxViewer({
  sources,
  keyExtractor,
  index: imageIndex,
  visible,
  onRequestClose,
  onLongPress = () => {},
  onIndexChange: onImageIndexChange,
  animationType = DEFAULT_ANIMATION_TYPE,
  backgroundColor = DEFAULT_BG_COLOR,
  presentationStyle = DEFAULT_PRESENTATION_STYLE,
  swipeToCloseEnabled,
  doubleTapToZoomEnabled,
  delayLongPress = DEFAULT_DELAY_LONG_PRESS,
  HeaderComponent,
  FooterComponent,
}: Props) {
  const listRef = useRef<VirtualizedList<LightboxSource>>(null)
  const [opacity, onRequestCloseEnhanced] = useRequestClose(onRequestClose)
  const [currentIndex, onScroll] = useIndexChange(imageIndex, SCREEN)
  const [headerTransform, footerTransform, toggleBarsVisible] = useAnimatedComponents()

  useEffect(() => {
    if (onImageIndexChange) {
      onImageIndexChange(currentIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  const onZoom = useCallback(
    (isScaled: boolean) => {
      // @ts-expect-error Property 'setNativeProps' does not exist on type 'VirtualizedList<ImageSource>'.
      listRef?.current?.setNativeProps({ scrollEnabled: !isScaled })
      toggleBarsVisible(!isScaled)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRef]
  )

  if (!visible) {
    return null
  }

  return (
    <Modal
      transparent={presentationStyle === 'overFullScreen'}
      visible={visible}
      presentationStyle={presentationStyle}
      animationType={animationType}
      onRequestClose={onRequestCloseEnhanced}
      supportedOrientations={['portrait']}
      hardwareAccelerated
    >
      <StatusBarManager presentationStyle={presentationStyle} />
      <View style={[styles.container, { opacity, backgroundColor }]}>
        <Animated.View style={[styles.header, { transform: headerTransform }]}>
          {typeof HeaderComponent !== 'undefined' ? (
            React.createElement(HeaderComponent, {
              imageIndex: currentIndex,
            })
          ) : (
            <ImageDefaultHeader onRequestClose={onRequestCloseEnhanced} />
          )}
        </Animated.View>
        <VirtualizedList
          ref={listRef}
          data={sources}
          horizontal
          pagingEnabled
          windowSize={2}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={imageIndex}
          getItem={(_, index) => sources[index]}
          getItemCount={() => sources.length}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item, index }) => {
            switch (item.type) {
              case 'IMAGE':
                return (
                  <ImageItem
                    onZoom={onZoom}
                    imageSrc={item.src}
                    onRequestClose={onRequestCloseEnhanced}
                    onLongPress={onLongPress}
                    delayLongPress={delayLongPress}
                    swipeToCloseEnabled={swipeToCloseEnabled}
                    doubleTapToZoomEnabled={doubleTapToZoomEnabled}
                  />
                )
              case 'VIDEO':
                return <VideoItem index={index} currentIndex={currentIndex} videoSrc={item.src} />
            }
          }}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(src, index) =>
            keyExtractor
              ? keyExtractor(src, index)
              : typeof src === 'number'
                ? `${src}`
                : src.src?.toString() || `${index}`
          }
        />
        {typeof FooterComponent !== 'undefined' && (
          <Animated.View style={[styles.footer, { transform: footerTransform }]}>
            {React.createElement(FooterComponent, {
              imageIndex: currentIndex,
            })}
          </Animated.View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    top: 0,
  },
  footer: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,
    bottom: 0,
  },
})

export const LightboxView = (props: Props) => <LightboxViewer key={props.index} {...props} />

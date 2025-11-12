// Ref https://www.npmjs.com/package/react-native-more-or-less-text
import React, { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutAnimation,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextLayoutEventData,
  TextLayoutLine,
  TextProps,
  View,
} from 'react-native'

export const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T>(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  // Defined once, so guaranteed stability
  const setters = useMemo(
    () => ({
      toggle: () => setValue((v) => !v),
      setFalse: () => setValue(false),
      setTrue: () => setValue(true),
      setValue,
    }),
    [setValue]
  )

  // Defined each time the value changes, so less than every render.
  return useMemo(
    () => ({
      ...setters,
      value,
    }),
    [value, setters]
  )
}

// setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture.
// // TODO: figure out why animation doesn't work on android
// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true)
// }

interface MoreOrLessProps {
  children: React.ReactNode
  numberOfLines: number
  moreText?: string
  lessText?: string
  textComponent?: ComponentType<TextProps>
  buttonComponent?: ComponentType<TextProps>
  animated?: boolean
}

export const MoreOrLess = ({
  animated = true,
  children,
  numberOfLines,
  moreText = 'more',
  lessText = 'less',
  textComponent: TextComponent = Text,
  buttonComponent: ButtonComponent = Text,
}: MoreOrLessProps) => {
  const { value: isExpanded, setTrue: expandText, setFalse: shrinkText } = useToggle(false)
  const [lines, setLines] = React.useState<TextLayoutLine[] | null>(null)
  const [hasMore, setHasMore] = React.useState(false)
  const previousChildren = usePrevious(children)
  const previousNumberOfLines = usePrevious(numberOfLines)
  const previousLines = usePrevious(lines)

  useEffect(() => {
    if (lines !== null && numberOfLines !== previousNumberOfLines) setLines(null)
  }, [lines, numberOfLines, previousNumberOfLines])

  useEffect(() => {
    if (animated)
      LayoutAnimation.configureNext({
        duration: 600,
        create: { type: 'linear', property: 'opacity' },
        update: { type: 'spring', springDamping: 2 },
        delete: { type: 'linear', property: 'opacity' },
      })
  }, [animated, isExpanded])

  const onTextLayoutGetLines = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const _lines = [...event.nativeEvent.lines]

      if (_lines.length > numberOfLines) {
        // Determine if showMore is shown or not and
        if (_lines[numberOfLines].text) setHasMore(true)
        // restore the array to be its original numberOfLines.
        while (_lines.length > numberOfLines) {
          const extraLine = _lines.pop()?.text ?? ''
          _lines[numberOfLines - 1].text += extraLine
        }
      }

      setLines(_lines)
    },
    [numberOfLines]
  )

  const onMorePress = useMemo(() => (hasMore ? expandText : undefined), [expandText, hasMore])

  if (!children) return null

  // Is rendered for the first time or children changed.
  if (lines === null || previousChildren !== children)
    return (
      <View>
        <TextComponent
          style={styles.absoluteFill}
          // "+ 1" because we want to see if
          // the lines include another one
          // or just fit all in 3 lines.
          numberOfLines={numberOfLines + 1}
          onTextLayout={onTextLayoutGetLines}
        >
          {children}
        </TextComponent>
      </View>
    )

  const linesToRender = lines ?? previousLines
  const Comp = hasMore ? Pressable : View
  if (linesToRender) {
    return (
      <Comp onPress={isExpanded ? shrinkText : onMorePress}>
        {isExpanded ? (
          <TextComponent>
            {children}
            <ButtonComponent> {lessText}</ButtonComponent>
          </TextComponent>
        ) : (
          <>
            <TextComponent numberOfLines={numberOfLines} ellipsizeMode="tail">
              {children}
            </TextComponent>
            {onMorePress && <ButtonComponent>{moreText}</ButtonComponent>}
          </>
        )}
      </Comp>
    )
  }
  return null
}

const styles = StyleSheet.create({
  absoluteFill: {
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  flexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})

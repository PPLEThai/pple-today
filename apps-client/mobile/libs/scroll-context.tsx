// https://github.com/bluesky-social/social-app/blob/ecb77a9b96500dac72b1b36f92e42bd899699445/src/lib/ScrollContext.tsx#L12

import { createContext, useContext, useMemo } from 'react'
import { type ScrollHandlers } from 'react-native-reanimated'

const ScrollContext = createContext<ScrollHandlers<any>>({
  // onBeginDrag: undefined,
  // onEndDrag: undefined,
  onScroll: undefined,
  // onMomentumEnd: undefined,
})
ScrollContext.displayName = 'ScrollContext'

export function useScrollContext(): ScrollHandlers<any> {
  return useContext(ScrollContext)
}

type ProviderProps = { children: React.ReactNode } & ScrollHandlers<any>

// Note: this completely *overrides* the parent handlers.
// It's up to you to compose them with the parent ones via useScrollHandlers() if needed.
export function ScrollContextProvider({
  children,
  // onBeginDrag,
  // onEndDrag,
  onScroll,
  // onMomentumEnd,
}: ProviderProps) {
  const handlers = useMemo(
    () => ({
      // onBeginDrag,
      // onEndDrag,
      onScroll,
      // onMomentumEnd,
    }),
    [
      // onBeginDrag,
      // onEndDrag,
      onScroll,
      // onMomentumEnd
    ]
  )
  return <ScrollContext.Provider value={handlers}>{children}</ScrollContext.Provider>
}

export function composeScrollHandler(
  context: ScrollHandlers<any>,
  scrollHandler: ScrollHandlers<any>
): ScrollHandlers<any> {
  return {
    // onBeginDrag: (event, ctx) => {
    //   'worklet'
    //   context.onBeginDrag?.(event, ctx)
    //   scrollHandler?.onBeginDrag?.(event, ctx)
    // },
    // onEndDrag: (event, ctx) => {
    //   'worklet'
    //   context.onEndDrag?.(event, ctx)
    //   scrollHandler?.onEndDrag?.(event, ctx)
    // },
    onScroll: (event, ctx) => {
      'worklet'
      context.onScroll?.(event, ctx)
      scrollHandler?.onScroll?.(event, ctx)
    },
    // onMomentumEnd: (event, ctx) => {
    //   'worklet'
    //   context.onMomentumEnd?.(event, ctx)
    //   scrollHandler?.onMomentumEnd?.(event, ctx)
    // },
  }
}

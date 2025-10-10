import React from 'react'
import { RefreshControl as RNRefreshControl } from 'react-native'

interface RefreshControlProps
  extends Omit<React.ComponentProps<typeof RNRefreshControl>, 'refreshing'> {
  onRefresh: () => void | Promise<void>
}

export function RefreshControl({ onRefresh: onRefreshProp, ...rest }: RefreshControlProps) {
  const [refreshing, setRefreshing] = React.useState(false)
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await onRefreshProp?.()
    setRefreshing(false)
  }, [onRefreshProp])
  return (
    <RNRefreshControl
      onRefresh={onRefresh}
      colors={['#FF6A13']} // base-primary-default
      {...rest} // make sure overridden styles (from RN) are passed down
      refreshing={refreshing}
    />
  )
}

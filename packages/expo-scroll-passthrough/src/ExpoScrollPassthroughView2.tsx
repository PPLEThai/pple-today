import * as React from 'react'

import { requireNativeView } from 'expo'

import { ExpoScrollPassthroughViewProps } from './ExpoScrollPassthrough.types'

const NativeView: React.ComponentType<ExpoScrollPassthroughViewProps> = requireNativeView(
  'ExpoScrollPassthrough',
  'ExpoScrollPassthroughView2'
)

export default function ExpoScrollPassthroughView2(props: ExpoScrollPassthroughViewProps) {
  return <NativeView {...props} />
}

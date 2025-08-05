import * as React from 'react'

import { requireNativeView } from 'expo'

import { ExpoScrollPassthroughViewProps } from './ExpoScrollPassthrough.types'

const NativeView: React.ComponentType<ExpoScrollPassthroughViewProps> = requireNativeView(
  'ExpoScrollPassthrough',
  'ExpoScrollPassthroughView3'
)

export default function ExpoScrollPassthroughView3(props: ExpoScrollPassthroughViewProps) {
  return <NativeView {...props} />
}

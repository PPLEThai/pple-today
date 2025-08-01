import * as React from 'react'

import { requireNativeView } from 'expo'

import { ExpoScrollPassthroughViewProps } from './ExpoScrollPassthrough.types'

const NativeView: React.ComponentType<ExpoScrollPassthroughViewProps> =
  requireNativeView('ExpoScrollPassthrough')

export default function ExpoScrollPassthroughView(props: ExpoScrollPassthroughViewProps) {
  return <NativeView {...props} />
}

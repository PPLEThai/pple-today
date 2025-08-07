import * as React from 'react'

import { requireNativeView } from 'expo'

import { ExpoScrollForwarderViewProps } from './ExpoScrollForwarder.types'

const NativeView: React.ComponentType<ExpoScrollForwarderViewProps> = requireNativeView(
  'ExpoScrollForwarder',
  'ExpoScrollForwarderView'
)

export default function ExpoScrollForwarderView(props: ExpoScrollForwarderViewProps) {
  return <NativeView {...props} />
}

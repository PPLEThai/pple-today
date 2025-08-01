import * as React from 'react';

import { ExpoScrollPassthroughViewProps } from './ExpoScrollPassthrough.types';

export default function ExpoScrollPassthroughView(props: ExpoScrollPassthroughViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}

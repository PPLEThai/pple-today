import React from 'react'

import { Text } from '@pple-today/ui/text'

import { openUrl } from '@app/utils/link'
import { parseTextSegments } from '@app/utils/linkify'

export interface LinkifiedTextProps extends React.ComponentProps<typeof Text> {
  children: string
}

/**
 * Renders text while highlighting any URLs as clickable links. Tapping a link
 * opens the mini app flow when the URL matches the allowed mini app origin,
 * otherwise it opens in the external browser.
 */
export function LinkifiedText({ children, ...props }: LinkifiedTextProps) {
  const segments = parseTextSegments(children)

  return (
    <Text {...props}>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <Text
              key={index}
              className="text-base-primary-default underline"
              onPress={() => openUrl(segment.value)}
            >
              {segment.value}
            </Text>
          )
        }
        return segment.value
      })}
    </Text>
  )
}

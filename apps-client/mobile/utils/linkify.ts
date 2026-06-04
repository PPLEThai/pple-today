export type TextSegment = { type: 'text'; value: string } | { type: 'link'; value: string }

// Matches http(s) URLs. The trailing character class avoids capturing common
// trailing punctuation (e.g. the period ending a sentence) as part of the URL.
const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,:;"')\]}!?]/gi

/**
 * Splits free-form text into plain-text and link segments so that URLs can be
 * rendered as highlighted, clickable elements.
 */
export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const regex = new RegExp(URL_REGEX)
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'link', value: match[0] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

import { describe, expect, test } from 'vitest'

import { parseTextSegments } from './linkify'

describe('parseTextSegments', () => {
  test('returns a single text segment when there is no URL', () => {
    expect(parseTextSegments('hello world')).toEqual([{ type: 'text', value: 'hello world' }])
  })

  test('extracts a URL surrounded by text', () => {
    expect(parseTextSegments('go to https://example.com now')).toEqual([
      { type: 'text', value: 'go to ' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: ' now' },
    ])
  })

  test('does not capture trailing punctuation', () => {
    expect(parseTextSegments('visit https://example.com.')).toEqual([
      { type: 'text', value: 'visit ' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: '.' },
    ])
  })

  test('extracts multiple URLs', () => {
    expect(parseTextSegments('https://a.com and https://b.com')).toEqual([
      { type: 'link', value: 'https://a.com' },
      { type: 'text', value: ' and ' },
      { type: 'link', value: 'https://b.com' },
    ])
  })

  test('keeps query strings and paths', () => {
    expect(parseTextSegments('open https://example.com/foo/bar?x=1 here')).toEqual([
      { type: 'text', value: 'open ' },
      { type: 'link', value: 'https://example.com/foo/bar?x=1' },
      { type: 'text', value: ' here' },
    ])
  })
})

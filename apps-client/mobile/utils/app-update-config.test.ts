import { describe, expect, it } from 'vitest'

import { PlatformUpdateConfigSchema, resolveUpdateRequirement } from './app-update-config'

const config = (input: Record<string, unknown>) =>
  PlatformUpdateConfigSchema.parse({ url: 'https://store', ...input })

describe('resolveUpdateRequirement', () => {
  describe('legacy config (version + isForceUpdate only)', () => {
    it('is soft when behind and not forced', () => {
      expect(resolveUpdateRequirement('1.0.0', config({ version: '1.1.0' }))).toEqual({
        mode: 'soft',
        targetVersion: '1.1.0',
      })
    })

    it('is hard when behind and forced', () => {
      expect(
        resolveUpdateRequirement('1.0.0', config({ version: '1.1.0', isForceUpdate: true }))
      ).toEqual({ mode: 'hard', targetVersion: '1.1.0' })
    })

    it('is null when up to date', () => {
      expect(
        resolveUpdateRequirement('1.1.0', config({ version: '1.1.0', isForceUpdate: true }))
      ).toBeNull()
    })
  })

  describe('with minimumVersion', () => {
    const cfg = config({ version: '2.0.0', minimumVersion: '1.5.0' })

    it('is hard below the minimum, advertising the latest version', () => {
      expect(resolveUpdateRequirement('1.4.9', cfg)).toEqual({
        mode: 'hard',
        targetVersion: '2.0.0',
      })
    })

    it('is soft between the minimum and the latest', () => {
      expect(resolveUpdateRequirement('1.5.0', cfg)).toEqual({
        mode: 'soft',
        targetVersion: '2.0.0',
      })
    })

    it('is null at the latest', () => {
      expect(resolveUpdateRequirement('2.0.0', cfg)).toBeNull()
    })

    it('stays hard when isForceUpdate is set for older builds', () => {
      expect(
        resolveUpdateRequirement(
          '1.6.0',
          config({ version: '2.0.0', minimumVersion: '1.5.0', isForceUpdate: true })
        )
      ).toEqual({ mode: 'hard', targetVersion: '2.0.0' })
    })

    it('advertises the minimum when it is misconfigured above the latest', () => {
      expect(
        resolveUpdateRequirement('1.0.0', config({ version: '1.1.0', minimumVersion: '1.2.0' }))
      ).toEqual({ mode: 'hard', targetVersion: '1.2.0' })
    })
  })

  it('is null when the current version is not parseable', () => {
    expect(resolveUpdateRequirement('', config({ version: '1.0.0' }))).toBeNull()
  })
})

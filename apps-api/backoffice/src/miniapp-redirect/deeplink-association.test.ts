import { describe, expect, test } from 'vitest'

import {
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  isDeepLinkAssociationConfigured,
  parseSha256CertFingerprints,
} from './deeplink-association'

describe('parseSha256CertFingerprints', () => {
  test('parses comma-separated fingerprints', () => {
    expect(
      parseSha256CertFingerprints(
        'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99,11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'
      )
    ).toHaveLength(2)
  })
})

describe('isDeepLinkAssociationConfigured', () => {
  test('returns false when any field is missing', () => {
    expect(
      isDeepLinkAssociationConfigured({
        iosTeamId: 'TEAM123',
        iosBundleId: 'th.or.peoplesparty.today',
      })
    ).toBe(false)
  })

  test('returns true when all fields are present', () => {
    expect(
      isDeepLinkAssociationConfigured({
        iosTeamId: 'TEAM123',
        iosBundleId: 'th.or.peoplesparty.today',
        androidPackageName: 'th.or.peoplesparty.today',
        androidSha256CertFingerprints: ['AA:BB:CC'],
      })
    ).toBe(true)
  })
})

describe('buildAppleAppSiteAssociation', () => {
  test('builds appID from team and bundle', () => {
    const result = buildAppleAppSiteAssociation({
      iosTeamId: 'TEAM123',
      iosBundleId: 'th.or.peoplesparty.today',
      androidPackageName: 'th.or.peoplesparty.today',
      androidSha256CertFingerprints: ['AA:BB:CC'],
    })

    expect(result.applinks.details[0].appID).toBe('TEAM123.th.or.peoplesparty.today')
    expect(result.applinks.details[0].paths).toEqual(['*'])
  })
})

describe('buildAssetLinks', () => {
  test('includes package and fingerprints', () => {
    const result = buildAssetLinks({
      iosTeamId: 'TEAM123',
      iosBundleId: 'th.or.peoplesparty.today',
      androidPackageName: 'th.or.peoplesparty.today',
      androidSha256CertFingerprints: ['AA:BB:CC', 'DD:EE:FF'],
    })

    expect(result[0].target.package_name).toBe('th.or.peoplesparty.today')
    expect(result[0].target.sha256_cert_fingerprints).toEqual(['AA:BB:CC', 'DD:EE:FF'])
  })
})

export type MiniAppDeepLinkAssociationConfig = {
  iosTeamId: string
  iosBundleId: string
  androidPackageName: string
  androidSha256CertFingerprints: string[]
}

export function isDeepLinkAssociationConfigured(
  config: Partial<MiniAppDeepLinkAssociationConfig>
): config is MiniAppDeepLinkAssociationConfig {
  return Boolean(
    config.iosTeamId &&
      config.iosBundleId &&
      config.androidPackageName &&
      config.androidSha256CertFingerprints &&
      config.androidSha256CertFingerprints.length > 0
  )
}

export function buildAppleAppSiteAssociation(config: MiniAppDeepLinkAssociationConfig) {
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${config.iosTeamId}.${config.iosBundleId}`,
          paths: ['*'],
        },
      ],
    },
  }
}

export function buildAssetLinks(config: MiniAppDeepLinkAssociationConfig) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackageName,
        sha256_cert_fingerprints: config.androidSha256CertFingerprints,
      },
    },
  ]
}

export function parseSha256CertFingerprints(value: string | undefined) {
  if (!value?.trim()) {
    return []
  }

  return value
    .split(',')
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean)
}

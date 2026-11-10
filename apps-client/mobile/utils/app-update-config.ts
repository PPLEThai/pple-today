import semver from 'semver'
import { z } from 'zod'

/**
 * Per-platform update config stored in Firebase Remote Config (`CHECK_APP_UPDATE`).
 *
 * - `version`: latest available version. Below it, the user gets an optional (soft) prompt.
 * - `minimumVersion`: lowest supported version. Below it, the update is mandatory (hard).
 *
 * Backward compatibility: builds released before `minimumVersion` existed only read
 * `version` + `isForceUpdate` (unknown keys are ignored by their schema). `isForceUpdate: true`
 * still makes `version` itself mandatory, so the same JSON keeps working for both old and new
 * builds. To force old builds, set `isForceUpdate`; new builds can rely on `minimumVersion`.
 */
export const PlatformUpdateConfigSchema = z.object({
  version: z.string(),
  url: z.string(),
  minimumVersion: z.string().optional(),
  /** @deprecated Prefer `minimumVersion`. Kept for builds that predate it. */
  isForceUpdate: z.boolean().optional().default(false),
})

export type PlatformUpdateConfig = z.infer<typeof PlatformUpdateConfigSchema>

export type UpdateRequirement = {
  mode: 'soft' | 'hard'
  /** Version to show to the user — always the latest available version. */
  targetVersion: string
}

function coerceSemver(value: string | undefined): string | null {
  if (!value) return null
  const coerced = semver.coerce(value)
  return coerced ? coerced.version : null
}

export function resolveUpdateRequirement(
  currentVersion: string,
  config: PlatformUpdateConfig
): UpdateRequirement | null {
  const current = coerceSemver(currentVersion)
  if (!current) return null

  const latest = coerceSemver(config.version)
  const minimum = coerceSemver(config.minimumVersion)

  // The store always installs the latest build, so advertise whichever is higher.
  const targetVersion =
    latest && minimum && semver.lt(latest, minimum) ? config.minimumVersion! : config.version

  if (minimum && semver.lt(current, minimum)) {
    return { mode: 'hard', targetVersion }
  }

  if (latest && semver.lt(current, latest)) {
    return { mode: config.isForceUpdate ? 'hard' : 'soft', targetVersion }
  }

  return null
}

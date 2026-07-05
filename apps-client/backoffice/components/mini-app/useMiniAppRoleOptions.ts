import { useMemo } from 'react'

import { reactQueryClient } from '~/libs/api-client'

interface RoleOption {
  label: string
  value: string
}

/**
 * Fetches the canonical mini-app role options from the backend and exposes
 * helpers for rendering them. Falls back gracefully when the upstream role API
 * fails so the forms/table never crash.
 */
export const useMiniAppRoleOptions = () => {
  const query = reactQueryClient.useQuery('/admin/mini-app/roles', {})

  const options = useMemo<RoleOption[]>(() => query.data ?? [], [query.data])

  const labelByValue = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options) map.set(option.value, option.label)
    return map
  }, [options])

  /** Map a stored role value to its label, falling back to the raw value without the `pple-ad:` prefix. */
  const getRoleLabel = useMemo(
    () => (value: string) => labelByValue.get(value) ?? value.replace(/^pple-ad:/, ''),
    [labelByValue]
  )

  /**
   * Build MultiSelect options that always include the currently-selected
   * values, even ones missing from the fetched options (so they are not
   * silently dropped on save).
   */
  const getOptionsWithSelected = useMemo(
    () =>
      (selected: string[]): RoleOption[] => {
        const merged = [...options]
        for (const value of selected) {
          if (!labelByValue.has(value)) merged.push({ value, label: getRoleLabel(value) })
        }
        return merged
      },
    [options, labelByValue, getRoleLabel]
  )

  return {
    options,
    isError: query.isError,
    getRoleLabel,
    getOptionsWithSelected,
  }
}

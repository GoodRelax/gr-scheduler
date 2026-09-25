// The default of one documentSettings key, assembled from the generated defaults the tables T-201 .. T-205 hold.

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'

const nestedFrom = (prefix: string): Record<string, unknown> | undefined => {
  const built: Record<string, unknown> = {}
  let found = false
  for (const [dotted, value] of Object.entries(SETTINGS_DEFAULTS)) {
    if (!dotted.startsWith(`${prefix}.`)) continue
    found = true
    const path = dotted.slice(prefix.length + 1).split('.')
    let at = built
    for (const step of path.slice(0, -1)) {
      at[step] ??= {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = value
  }
  return found ? built : undefined
}

// see OP-6
export const settingDefaultOf = (key: string): unknown =>
  Object.hasOwn(SETTINGS_DEFAULTS, key) ? SETTINGS_DEFAULTS[key] : nestedFrom(key)

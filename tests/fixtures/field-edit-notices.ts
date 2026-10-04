// Whether a text entry stands open on a surface, read from IF-9's begin and end notices.

import type { ScreenSurface } from '../../src/adapter/screen-renderer/screen-surface'

const OPEN_ROWS = new WeakMap<ScreenSurface, Set<string>>()

// see IF-9
// WHY: reading the notices takes them, so the rows still open are kept per surface.
export function textEntryStandsOpen(surface: ScreenSurface): boolean {
  const open = OPEN_ROWS.get(surface) ?? new Set<string>()
  for (const notice of surface.readFieldEditNotices?.() ?? []) {
    if (notice.kind === 'began') open.add(notice.row)
    else open.delete(notice.row)
  }
  OPEN_ROWS.set(surface, open)
  return open.size > 0
}

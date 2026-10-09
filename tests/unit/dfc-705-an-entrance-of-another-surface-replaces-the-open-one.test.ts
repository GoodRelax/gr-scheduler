// DFC-705: table T-280 openSurfaceStateMachine -- a surface entrance pressed while another surface is open replaces it.

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { bareAll } from '../contract/spec-table'
import { taskGroupDocument, rowOf, shell, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const surfaceOf = (icon: string): string => bareAll(rowOf('T-109', icon).by['面'] ?? '')[0] ?? ''
const ROSTER_ENTRANCE = 'IC-62'
const EXPORT_ENTRANCE = 'IC-2'
const WATERMARK_ENTRANCE = 'IC-41'

const take = (built: ShellBench, icon: string): void => {
  built.aim({ part: surfaceOf(icon), entry: icon, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as ScreenPart)
  built.click(80, 120)
  built.aim(null)
}
const openSurface = (built: ShellBench): string | null => (built.last().openModal as { surface?: string } | null)?.surface ?? null

describe('S-99g / table T-280 (DFC-705) -- one surface is open at a time, and a later entrance replaces it', () => {
  const benchOf = (): ShellBench => {
    const built = shell(taskGroupDocument([{ id: 'g1', parentId: null }]))
    benches.push(built)
    return built
  }

  it('the roster is replaced by the Export Chooser, which is replaced by the roster again', () => {
    const built = benchOf()
    take(built, ROSTER_ENTRANCE)
    expect(openSurface(built), 'premise').toBe(surfaceOf('IC-66'))
    take(built, EXPORT_ENTRANCE)
    expect(openSurface(built), 'the second entrance wins').toBe('Export Chooser')
    take(built, ROSTER_ENTRANCE)
    expect(openSurface(built), 'and the first wins back').toBe(surfaceOf('IC-66'))
  })

  it('the watermark entrance replaces an open surface the same way, and no notice is told for it', () => {
    const built = benchOf()
    take(built, ROSTER_ENTRANCE)
    take(built, WATERMARK_ENTRANCE)
    expect(openSurface(built)).not.toBe(surfaceOf('IC-66'))
    expect(openSurface(built), 'a surface stands').not.toBeNull()
    expect(built.last().notices).toEqual([])
  })

  it('the same entrance pressed again leaves its surface open (self, no change)', () => {
    const built = benchOf()
    take(built, ROSTER_ENTRANCE)
    take(built, ROSTER_ENTRANCE)
    expect(openSurface(built)).toBe(surfaceOf('IC-66'))
  })
})

// DFC-785: FR-053 / FR-102 -- a minimised Command Palette shows IC-76 pressed on its grab band while the interaction record runs.

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-renderer'
import { keyOf, rowDocument, shell, type ShellBench } from './cr-541-stage'

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const RECORD = 'IC-76'
const MINIMISE = 'IC-75'
const PALETTE_KEY = 'P'

const take = (built: ShellBench, icon: string): void => {
  built.aim({ part: 'Command Palette', entry: icon, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as ScreenPart)
  built.click(30, 650)
  built.aim(null)
}

const bandRecordOf = (built: ShellBench): { icon: string; isPressed: boolean } | null => {
  const palette = built.last().commandPalette
  return (palette?.bandRecord as { icon: string; isPressed: boolean } | null | undefined) ?? null
}

describe('FR-053 / FR-102 (DFC-785) -- the record can be read from a minimised palette', () => {
  const benchOf = (): ShellBench => {
    const built = shell(rowDocument([{ id: 'g1', parentId: null }]))
    benches.push(built)
    return built
  }

  it('minimised and recording: IC-76 stands on the band, pressed', () => {
    const built = benchOf()
    take(built, RECORD)
    take(built, MINIMISE)
    expect(built.last().commandPalette?.isMinimised, 'premise: the palette is minimised').toBe(true)
    expect(bandRecordOf(built)?.icon).toBe(RECORD)
    expect(bandRecordOf(built)?.isPressed).toBe(true)
  })

  it('minimised and not recording: nothing of the record stands on the band', () => {
    const built = benchOf()
    take(built, MINIMISE)
    expect(built.last().commandPalette?.isMinimised).toBe(true)
    expect(bandRecordOf(built)).toBeNull()
  })

  it('shown in full and recording: the band carries nothing (the entrance stands among the others)', () => {
    const built = benchOf()
    take(built, RECORD)
    expect(built.last().commandPalette?.isMinimised).toBe(false)
    expect(bandRecordOf(built)).toBeNull()
  })

  it('S-99e hidden while recording: no palette is drawn, so nothing is claimed to be readable (the FR-102 exception)', () => {
    const built = benchOf()
    take(built, RECORD)
    built.send(keyOf(PALETTE_KEY))
    expect(built.last().commandPalette).toBeNull()
  })

  it('stopping the record from the band takes IC-76 off it', () => {
    const built = benchOf()
    take(built, RECORD)
    take(built, MINIMISE)
    take(built, RECORD)
    expect(built.last().commandPalette?.isMinimised).toBe(true)
    expect(bandRecordOf(built)).toBeNull()
  })
})

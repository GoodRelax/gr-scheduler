// DFC-703 spec-only cases: T-280 -- the open surface is named by its U row (U-49, U-54, U-56, U-60, U-61, U-62, U-65) in every event the input makes, so the machine can tell an open road surface (U-56, U-61) that awaits an answer.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  screenEventFromInput,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { contextOf, documentOf } from './cr-606-stage'
import { HERE_TASK_GROUP, OPEN_CHOOSER, keyOfRow, oneTaskGroupDocument, reasonWords } from './cr-610-file-flow-stage'
import { bare, bareAll, specTable } from './spec-table'
import { jsonBytes, paletteStage, surfaceOfEntrance, there, type PaletteStage } from './wp-p1-palette-stage'

interface RawMachine {
  readonly name: string
  readonly states: readonly { readonly key: string; readonly carries: readonly { readonly name: string; readonly rows?: readonly string[] }[] }[]
}
interface RawRegion {
  readonly region: string
  readonly machines?: readonly RawMachine[]
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string; readonly rows?: readonly string[] }[] }[]
}

// see T-280
const REGIONS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly RawRegion[]
  }
).regions

const OPEN_STATE_ROWS =
  REGIONS.flatMap((region) => region.machines ?? [])
    .find((machine) => machine.name === 'openSurfaceStateMachine')
    ?.states.find((state) => state.key === 'open')
    ?.carries.find((carried) => carried.name === 'surfaceName')?.rows ?? []
const FLOW_CLOSED_ROWS =
  REGIONS.find((region) => region.region === 'fileFlow')
    ?.events.find((event) => event.key === 'flowSurfaceClosed')
    ?.carries.find((carried) => carried.name === 'surfaceName')?.rows ?? []

const uRowNamed = (englishName: string): string => {
  const found = specTable('T-103').rows.find((one) => bareAll(one.by['確定名（英）'] ?? '').includes(englishName))
  if (found === undefined) throw new Error(`table T-103 has no surface named ${englishName}`)
  return found.id
}

const ROSTER_ENTRANCE = 'IC-62'
const EXPORT_ENTRANCE = 'IC-2'
const EXPORT_KEY_ROW = 'SK-12'
const CLOSE_ENTRANCE = 'IC-52'
const MERGE = 'IC-72'
const REFUSAL = 'RS-27'

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const release: PointerInput = { kind: 'pointer', phase: 'up', button: 'left', x: 1, y: 1, modifiers: NO_MODIFIERS, clickCount: 1 }

const context = contextOf(documentOf({ tasks: [] }))
const eventOfPressOn = (entry: string) => {
  const on = {
    part: bare(specTable('T-109').rows.find((one) => one.id === entry)?.by['面'] ?? ''),
    entry,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  } as unknown as ScreenPart
  const pressed: PointerPress = { at: { ...release, phase: 'down' }, hit: null, on, pressRow: 'PTD-5' }
  return screenEventFromInput(release, { ...context, pressed })
}

const toldReasons = (view: ScreenView): readonly string[] =>
  view.notices.flatMap((one) => one.raisedNotices.map((two) => two.reason))

async function withOpenChooser(): Promise<PaletteStage> {
  const built = await paletteStage()
  await built.open(built.file('theirs.json', jsonBytes(there())))
  expect(built.surfaceName(), 'precondition: SK-10 raised no U-56').toBe(OPEN_CHOOSER())
  return built
}

async function withDifferenceReview(): Promise<PaletteStage> {
  const built = await paletteStage()
  const renamed = oneTaskGroupDocument('Here', HERE_TASK_GROUP, 1) as unknown as { schedule: { tasks: { name: string }[] } }
  const first = renamed.schedule.tasks[0]
  if (first === undefined) throw new Error('the bench document holds no Task')
  first.name = 'Renamed by the import'
  await built.open(built.file('same.json', jsonBytes(renamed)))
  await built.press(OPEN_CHOOSER(), MERGE)
  expect(built.surfaceName(), 'precondition: a matched Task asks first').toBe('Difference Review')
  return built
}

describe('DFC-703 -- the manuscript these cases are driven by', () => {
  it('T-280: the open state carries a U row of T-103, and the flow-closed event carries U-56, U-61 and U-62 among them', () => {
    expect(OPEN_STATE_ROWS.length).toBeGreaterThan(0)
    for (const row of OPEN_STATE_ROWS) expect(specTable('T-103').rows.some((one) => one.id === row), row).toBe(true)
    expect(FLOW_CLOSED_ROWS).toEqual(['U-56', 'U-61', 'U-62'])
    for (const row of FLOW_CLOSED_ROWS) expect(OPEN_STATE_ROWS).toContain(row)
  })
})

describe('DFC-703 -- PI-18 the surface an entrance opens is named by its U row', () => {
  it('IC-62 makes surfaceEntryPressed naming the Resource Roster by its U row', () => {
    expect(eventOfPressOn(ROSTER_ENTRANCE)).toEqual({ type: 'surfaceEntryPressed', surfaceName: uRowNamed('Resource Roster') })
  })

  it('IC-2 makes surfaceEntryPressed naming the Export Chooser by its U row', () => {
    expect(eventOfPressOn(EXPORT_ENTRANCE)).toEqual({ type: 'surfaceEntryPressed', surfaceName: uRowNamed('Export Chooser') })
  })

  it('SK-12 names the same row as IC-2 (U-54 says both open it)', () => {
    expect(screenEventFromInput(keyOfRow(EXPORT_KEY_ROW), context)).toEqual({
      type: 'surfaceEntryPressed',
      surfaceName: uRowNamed('Export Chooser'),
    })
  })

  it('each surface the entrances open is a value T-280 allows', () => {
    expect(OPEN_STATE_ROWS).toContain(uRowNamed('Resource Roster'))
    expect(OPEN_STATE_ROWS).toContain(uRowNamed('Export Chooser'))
  })
})

describe('DFC-703 -- T-280 surfaceEntryPressed x open: the road surface that awaits an answer is not replaced', () => {
  it('control: with no surface standing, IC-2 raises the Export Chooser', async () => {
    const built = await paletteStage()
    await built.press(surfaceOfEntrance(EXPORT_ENTRANCE), EXPORT_ENTRANCE)
    expect(built.surfaceName()).toBe('Export Chooser')
  })

  it('U-56 awaits: IC-2 carries RS-27 unseen (CR-712) and U-56 stays', async () => {
    const built = await withOpenChooser()
    await built.press(surfaceOfEntrance(EXPORT_ENTRANCE), EXPORT_ENTRANCE)
    expect(toldReasons(built.last())).not.toContain(REFUSAL)
    expect(reasonWords(REFUSAL).text.ja.length).toBeGreaterThan(0)
    expect(built.surfaceName()).toBe(OPEN_CHOOSER())
  })

  it('U-61 awaits: IC-2 carries RS-27 unseen (CR-712) and U-61 stays', async () => {
    const built = await withDifferenceReview()
    await built.press(surfaceOfEntrance(EXPORT_ENTRANCE), EXPORT_ENTRANCE)
    expect(toldReasons(built.last())).not.toContain(REFUSAL)
    expect(built.surfaceName()).toBe('Difference Review')
  })

  it('U-54 stands (it awaits no road answer): IC-62 replaces it with the roster and tells nothing', async () => {
    const built = await paletteStage()
    await built.press(surfaceOfEntrance(EXPORT_ENTRANCE), EXPORT_ENTRANCE)
    await built.press(surfaceOfEntrance(ROSTER_ENTRANCE), ROSTER_ENTRANCE)
    expect(built.surfaceName()).toBe('Resource Roster')
    expect(toldReasons(built.last())).not.toContain(REFUSAL)
  })
})

describe('DFC-703 -- T-280 flowSurfaceClosed: closing a road surface tells the road', () => {
  it('closing U-56 with IC-52 frees the road: the next open raises U-56 again', async () => {
    const built = await withOpenChooser()
    await built.press(OPEN_CHOOSER(), CLOSE_ENTRANCE)
    expect(built.surfaceName(), 'precondition: IC-52 left U-56 standing').toBeNull()
    await built.open(built.file('again.json', jsonBytes(there())))
    expect(built.surfaceName()).toBe(OPEN_CHOOSER())
  })
})

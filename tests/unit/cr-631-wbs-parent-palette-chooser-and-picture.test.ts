// CR-631 spec-only cases: the IC-141 toggle and IC-142 arm on the palette, the QN-12 chooser, the pointers and the drawn arrows.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { KEY, type HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import { confirmationFromSession } from '../../src/adapter/screen-renderer/notices'
import type { ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { parentTaskParts } from '../../src/adapter/svg-renderer/schedule-overlays'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionOfAll, type Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { drawnSettingsOf } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { pointerImageOf, pointerRowOf } from '../../src/framework/single-html-shell/pointer-shape'
import {
  choiceStepOf,
  isMixedParentPick,
  selectionOfParentChoice,
  parentTaskHoldOf,
} from '../../src/framework/single-html-shell/parent-task-hold'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable, unbroken } from '../contract/spec-table'
import {
  arrowOf,
  C,
  cellOf,
  D,
  E,
  F,
  FAMILY,
  MODS,
  midOfArrow,
  numberIn,
  numbersIn,
  P,
  pointerAt,
  rowText,
  sceneOf,
  scheduleOf,
  type Loose,
} from './cr-631-scene'

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

interface DictionaryWord {
  readonly part: string
  readonly text: { readonly ja: string; readonly en: string }
}

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { readonly parentTaskChoice: readonly DictionaryWord[] }

const wordOf = (part: string, language: 'ja' | 'en'): string => {
  const found = WORDS.parentTaskChoice.find((one) => one.part === part)
  if (found === undefined) throw new Error(`the dictionary parentTaskChoice has no part ${part}`)
  return found.text[language]
}

const QN_12_TWO = '答えは辞書の `parentTaskChoice` の 2 つの語の択であり、`Yes` / `No` ではない。'
const QN_12_FIRST = '1 つ目の択は、`AR-7` を構えていれば「親子関係を定義するため子タスクを選択」、構えていなければ「タスクを選択」と短くする。'
const QN_12_NEAR = '面はポインタの近くに立ち、`Esc` か面の外を押せば選ばずに閉じる（`PTL-14`）'
const WL_POINTER = '⭐ ポインタの形は、`AR-7` を構えているあいだは日程表の描画領域の全体で 表 T-269 の `PK-17` とし、構えずに親子判別だけが入のときは実線の矢印の上でだけ `PK-17`、破線の矢印の上で `PK-18` とすること（MUST）。'
const FR_135_SCREEN_ONLY = '家族の矢印と、`?`・候補の枠と番号は、依存線と同じ重ね順（`FR-110` の 表 T-020 の `ZO-4`）に描き、画面にだけ描くこと（MUST）'
const FR_135_SELECTED = '選んだ矢印は、依存線と同じく、その太さに 表 T-206 の `S-447` を足した太さで描くこと（MUST）（表 T-023c の `SL-8`）。'

describe('CR-631 -- the manuscript these cases are driven by', () => {
  it('T-234 QN-12, T-351 PTL-13 / PTL-14 and the closing pointer rule still say it', () => {
    for (const clause of [QN_12_TWO, QN_12_FIRST, QN_12_NEAR]) expect(flat(rowText('T-234', 'QN-12')), clause).toContain(flat(clause))
    expect(flat(rowText('T-351', 'PTL-13'))).toContain('混ざった選択を残さず、ポインタの近くに 表 T-234 の `QN-12` の 2 択を出す。')
    expect(flat(rowText('T-351', 'PTL-14'))).toContain('混ざる前の選択に戻す')
    for (const clause of [WL_POINTER, FR_135_SCREEN_ONLY, FR_135_SELECTED]) expect(REQUIREMENTS, clause).toContain(clause)
  })

  it('the dictionary words QN-12 names: the short first answers and the arrows answer', () => {
    expect(wordOf('childTasks', 'ja')).toContain('親子関係を定義するため子タスクを選択')
    expect(wordOf('tasks', 'ja')).toContain('タスクを選択')
    expect(wordOf('links', 'ja').length).toBeGreaterThan(0)
  })

  it('S-484 defaults to off, IC-141 sits right of IC-81, and IC-142 right of IC-141 (CR-658)', () => {
    expect(cellOf('T-206', 'S-484', '既定')).toContain('false')
    expect(flat(rowText('T-109', 'IC-141'))).toContain('依存線の表示（`IC-81`）の右に並べる。')
    expect(flat(rowText('T-109', 'IC-142'))).toContain('親子判別（`IC-141`）のすぐ右に並べる')
    expect(cellOf('T-109', 'IC-142', '群')).toBe(cellOf('T-109', 'IC-141', '群'))
  })
})

const task = (uid: number) => ({ kind: 'task', uid })
const link = (childUid: number) => ({ kind: 'parentTaskLink', childUid })
const pick = (...items: readonly Loose[]): Selection => selectionOfAll(items as unknown as Parameters<typeof selectionOfAll>[0])
const itemKinds = (selection: Selection): string[] =>
  (selection as unknown as { readonly items: readonly Loose[] }).items
    .map((one) => (one['kind'] === 'task' ? `task ${one['uid']}` : `link ${one['childUid']}`))
    .sort()

const sessionWith = (selection: Selection | null, armed = false, language: 'ja' | 'en' = 'ja'): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    armModeState: armed ? { kind: 'parentTaskArmed' } : { kind: 'notArmed' },
  } as unknown as ScreenSession['screen'],
  selection: {
    ...emptyScreenSession.selection,
    selectionState: selection === null ? emptyScreenSession.selection.selectionState : { kind: 'objectsSelected', selectedObjects: selection },
  } as unknown as ScreenSession['selection'],
})

const SCHEDULE = scheduleOf(FAMILY)

describe('IC-141 / S-484 / AR-7 -- when the families are drawn', () => {
  it('S-484: a fresh hold reads the links as not shown and draws no family', () => {
    const hold = parentTaskHoldOf()
    expect(hold.readings(sessionWith(null), false).isParentTaskLinksShown).toBe(false)
    expect(hold.familiesFor(SCHEDULE, sessionWith(pick(task(C))), { kind: 'task', taskUid: C }, null)).toBeNull()
  })

  it('IC-141: the entry toggles the links on and off; another entry does not', () => {
    const hold = parentTaskHoldOf()
    expect(hold.isToggledBy('IC-142' as never)).toBe(false)
    expect(hold.readings(sessionWith(null), false).isParentTaskLinksShown).toBe(false)
    expect(hold.isToggledBy('IC-141' as never)).toBe(true)
    expect(hold.readings(sessionWith(null), false).isParentTaskLinksShown).toBe(true)
    hold.isToggledBy('IC-141' as never)
    expect(hold.readings(sessionWith(null), false).isParentTaskLinksShown).toBe(false)
  })

  it('AR-7: armed, the families are drawn though IC-141 is off', () => {
    const hold = parentTaskHoldOf()
    const families = hold.familiesFor(SCHEDULE, sessionWith(pick(task(C)), true), null, null)
    expect(families?.ownerUids).toEqual([C])
  })

  it('FR-135: the owners are the pointed task and the picked tasks', () => {
    const hold = parentTaskHoldOf()
    hold.isToggledBy('IC-141' as never)
    const families = hold.familiesFor(SCHEDULE, sessionWith(pick(task(F))), { kind: 'task', taskUid: C }, null)
    expect([...(families?.ownerUids ?? [])].sort()).toEqual([C, F].sort())
    expect(families?.pointedUid).toBe(C)
  })

  it('FR-135: once an arrow is picked, the owner drawn when the picking began stays an owner beside the arrow child', () => {
    const hold = parentTaskHoldOf()
    hold.isToggledBy('IC-141' as never)
    hold.familiesFor(SCHEDULE, sessionWith(null), { kind: 'task', taskUid: P }, null)
    const families = hold.familiesFor(SCHEDULE, sessionWith(pick(link(F))), null, null)
    expect([...(families?.ownerUids ?? [])].sort()).toEqual([P, F].sort())
    expect([...(families?.selectedLinkChildUids ?? [])]).toEqual([F])
  })
})

const AT = { x: 321, y: 123 }

describe('PTL-13 / PTL-14 / QN-12 -- a mixed pick asks which kind to keep', () => {
  it('PTL-13: a pick of a task and an arrow is mixed; tasks alone or arrows alone are not', () => {
    expect(isMixedParentPick(pick(task(C), link(F)))).toBe(true)
    expect(isMixedParentPick(pick(task(C), task(F)))).toBe(false)
    expect(isMixedParentPick(pick(link(C), link(F)))).toBe(false)
  })

  it('PTL-13: a mixed pick is not kept -- the selection before it stays and the chooser stands at the pointer', () => {
    const hold = parentTaskHoldOf()
    const before = pick(task(D))
    const kept = hold.pickedAfter(pick(task(C), link(F)), before, AT)
    expect(itemKinds(kept)).toEqual(itemKinds(before))
    expect(hold.isChoiceStanding()).toBe(true)
    expect(hold.readings(sessionWith(before), false).parentTaskChoice).toEqual({ at: AT, isArmed: false })
  })

  it('PTL-13: a pick of one kind passes through and raises no chooser', () => {
    const hold = parentTaskHoldOf()
    const picked = pick(task(C), task(F))
    expect(itemKinds(hold.pickedAfter(picked, emptySelection(), AT))).toEqual(itemKinds(picked))
    expect(hold.isChoiceStanding()).toBe(false)
  })

  it('QN-12: answering links keeps only the arrows; answering tasks or childTasks keeps only the tasks', () => {
    const mixed = pick(task(C), link(F), task(E))
    expect(itemKinds(selectionOfParentChoice(mixed, 'links'))).toEqual([`link ${F}`])
    expect(itemKinds(selectionOfParentChoice(mixed, 'tasks'))).toEqual([`task ${C}`, `task ${E}`].sort())
    expect(itemKinds(selectionOfParentChoice(mixed, 'childTasks'))).toEqual([`task ${C}`, `task ${E}`].sort())
  })

  it('PTL-13: a release on an answer picks that kind and the chooser closes', () => {
    const hold = parentTaskHoldOf()
    hold.pickedAfter(pick(task(C), link(F)), emptySelection(), AT)
    const step = hold.choiceStepFor(pointerAt('up', AT) as HumanInput, 'links')
    expect(step?.kind).toBe('picked')
    expect(step?.kind === 'picked' ? itemKinds(step.picked) : []).toEqual([`link ${F}`])
    expect(hold.isChoiceStanding()).toBe(false)
  })

  it('PTL-14: Esc closes the chooser without picking', () => {
    const hold = parentTaskHoldOf()
    hold.pickedAfter(pick(task(C), link(F)), emptySelection(), AT)
    expect(hold.choiceStepFor({ kind: 'key', key: KEY.escape, modifiers: MODS } as HumanInput, null)).toEqual({ kind: 'closed' })
    expect(hold.isChoiceStanding()).toBe(false)
  })

  it('PTL-14: a press outside the two answers closes the chooser without picking', () => {
    expect(choiceStepOf(pick(task(C), link(F)), pointerAt('down', { x: 1, y: 1 }) as HumanInput, null)).toEqual({ kind: 'closed' })
  })

  it.each([
    [false, 'tasks', 'ja'],
    [true, 'childTasks', 'ja'],
    [false, 'tasks', 'en'],
  ] as const)('QN-12: armed %s, the chooser answers are the dictionary words %s then links (%s), at the pointer', (isArmed, first, language) => {
    const readings = { confirmation: null, parentTaskChoice: { at: AT, isArmed } } as unknown as ScreenViewReadings
    const shown = confirmationFromSession(sessionWith(null, isArmed, language), readings)
    expect(shown).not.toBeNull()
    expect(shown?.answers.map((one) => one.text)).toEqual([wordOf(first, language), wordOf('links', language)])
    expect(shown?.at).toEqual(AT)
  })

  it('QN-12: with no mixed pick standing there is no chooser', () => {
    const readings = { confirmation: null, parentTaskChoice: null } as unknown as ScreenViewReadings
    expect(confirmationFromSession(sessionWith(null), readings)).toBeNull()
  })
})

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const paletteOf = (session: ScreenSession, isParentTaskLinksShown: boolean) => {
  const palette = commandPaletteFromSession(session, { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings, emptySelection(),
    { ...READINGS, isParentTaskLinksShown }, SCHEDULE)
  if (palette === null) throw new Error('premise: the palette is showing')
  return palette
}

const entryOf = (palette: ReturnType<typeof paletteOf>, icon: string) => {
  const found = palette.groups.flatMap((group) => group.commands).find((one) => one.icon === icon)
  if (found === undefined) throw new Error(`the palette has no ${icon}`)
  return found
}

describe('T-109 IC-141 / IC-142 -- the two palette entries', () => {
  it('IC-141: the entry reads pressed exactly while the links are shown', () => {
    expect(entryOf(paletteOf(sessionWith(null), true), 'IC-141').isPressed).toBe(true)
    expect(entryOf(paletteOf(sessionWith(null), false), 'IC-141').isPressed).toBe(false)
  })

  it('IC-142 / AR-7: the entry reads armed exactly while the parent task link is armed', () => {
    expect(entryOf(paletteOf(sessionWith(null, true), false), 'IC-142').isArmed).toBe(true)
    expect(entryOf(paletteOf(sessionWith(null, false), false), 'IC-142').isArmed).toBe(false)
  })

  it.each([
    ['IC-141', 'IC-81'],
    ['IC-142', 'IC-141'],
  ] as const)('%s stands immediately right of %s in the same group', (entry, left) => {
    const group = paletteOf(sessionWith(null), false).groups.find((one) => one.commands.some((command) => command.icon === left))
    const icons = (group?.commands ?? []).map((one) => one.icon as string)
    expect(icons.indexOf(entry), JSON.stringify(icons)).toBe(icons.indexOf(left) + 1)
  })

  it('T-109: the manuscript puts IC-141 and IC-142 on the Command Palette', () => {
    for (const id of ['IC-141', 'IC-142']) {
      const row = specTable('T-109').rows.find((one) => one.id === id)
      expect(row?.by['面'] ?? '').toContain('Command Palette')
    }
  })
})

describe('T-269 PK-17 / PK-18 -- the pointer over the arrows', () => {
  it('PK-17: the link pointer is a drawn image whose hot spot is the centre of an S-249 square', () => {
    const shape = String(pointerImageOf('PK-17' as never))
    expect(shape.startsWith('url(data:image/svg+xml')).toBe(true)
    const spot = shape.match(/\)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/)
    const half = numberIn(cellOf('T-206', 'S-249', '既定')) / 2
    expect(spot === null ? null : [Number(spot[1]), Number(spot[2])]).toEqual([half, half])
  })

  it('PK-18: the forbidden pointer is the environment not-allowed', () => {
    expect(String(pointerImageOf('PK-18' as never))).toBe('not-allowed')
  })

  it('T-351: unarmed, a solid arrow shows PK-17 and a dashed one PK-18', () => {
    const scene = sceneOf({ ownerUids: [P, D] })
    const on = (childUid: number) => {
      const at = midOfArrow(scene, childUid)
      return pointerRowOf(itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf()) as never, false)
    }
    expect(on(P)).toBe('PK-17')
    expect(on(D)).toBe('PK-18')
  })
})

describe('FR-135 -- the arrows as drawn', () => {
  const themed = (rowId: string): string => `ink-${rowId}`
  const partsOf = (scene: ReturnType<typeof sceneOf>, drawsOperationState: boolean): readonly string[] =>
    parentTaskParts(scene.geometry, drawnSettingsOf(scene.settings as unknown as DocumentSettings), themed, drawsOperationState)
  const polylineOf = (parts: readonly string[], childUid: number): string => {
    const found = parts.join('').match(new RegExp(`<polyline[^>]*parent-task-${childUid}"[^>]*/>`))
    if (found === null) throw new Error(`no polyline for child ${childUid} in ${parts.join('')}`)
    return found[0]
  }
  const widthOf = (polyline: string): number => Number(polyline.match(/stroke-width="([^"]+)"/)?.[1])

  it('FR-135 / T-076: a picture drawn without the operation state carries no arrow, no ? and no candidate', () => {
    expect(partsOf(sceneOf({ ownerUids: [P, D, E] }), false)).toEqual([])
  })

  it('FR-135 / S-486 / S-398: on the screen the stated arrow is a solid S-398 line, the derived one dashed by S-486', () => {
    const parts = partsOf(sceneOf({ ownerUids: [P, D] }), true)
    const solid = polylineOf(parts, P)
    const dashed = polylineOf(parts, D)
    expect(solid).not.toContain('stroke-dasharray')
    expect(solid).toContain('stroke="ink-S-398"')
    expect(dashed).toContain('stroke="ink-S-398"')
    const dash = dashed.match(/stroke-dasharray="([^"]+)"/)?.[1] ?? ''
    expect(numbersIn(dash)).toEqual(numbersIn(cellOf('T-206', 'S-486', '既定')).slice(0, 2))
  })

  it('FR-135 / SL-8: a selected arrow is drawn S-447 thicker than an unselected one', () => {
    const parts = partsOf(sceneOf({ ownerUids: [P], selectedLinkChildUids: [F] }, pick(link(F))), true)
    expect(arrowOf(sceneOf({ ownerUids: [P], selectedLinkChildUids: [F] }, pick(link(F))), F).isSelected).toBe(true)
    expect(widthOf(polylineOf(parts, F)) - widthOf(polylineOf(parts, C))).toBeCloseTo(numberIn(cellOf('T-206', 'S-447', '既定')), 3)
  })

  it('FR-135 / VO-4 / S-389: an undecided child is marked with ? and its candidates are ringed and numbered in S-389', () => {
    const drawn = partsOf(sceneOf({ ownerUids: [E] }), true).join('')
    expect(drawn).toMatch(/fill="ink-S-389"[^>]*>\?<\/text>/)
    expect(drawn).toMatch(/<rect[^>]*stroke="ink-S-389"[^>]*stroke-dasharray/)
    expect(drawn).toMatch(/fill="ink-S-389"[^>]*>1<\/text>/)
    expect(drawn).toMatch(/fill="ink-S-389"[^>]*>2<\/text>/)
  })
})

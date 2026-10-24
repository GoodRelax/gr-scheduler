// The scripted cases of the frame-loop comparator. Each scenario names a document, the hosts the loop
// is given, and a sequence of steps; the bench records everything and the runner writes one digest.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  Bench,
  CLOCK_START,
  type BenchOptions,
  KIT,
  SCREEN,
  UNSETTLED,
  WIDE,
  keyInput,
  mods,
  part,
  pointerInput,
  richDocument,
  twoGroupDocument,
  type Modifiers,
  type Part,
} from './frame-loop-bench'
import { vi } from 'vitest'

import { CaseLines, canon, errorRecord, guarded } from './canon'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

export interface Deps {
  readonly entry: Any
  readonly installAgentApi: Any
  readonly session: Any
}

export interface Scenario {
  readonly id: string
  readonly options: BenchOptions
  readonly run: (bench: Bench, deps: Deps) => Promise<void>
}

// ---------------------------------------------------------------------------
// Fixed inputs read from the kit (never from the checkout under test)
// ---------------------------------------------------------------------------

const SPEC = JSON.parse(readFileSync(join(KIT, 'data', 'spec-tables.json'), 'utf8')) as Record<string, { id: string; cells: string[] }[]>
const SMALL_XML = readFileSync(join(KIT, 'data', 'inputs', 'sample-small-website-renewal.en.xml'), 'utf8')

const spans = (cell: string): string[] => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '')

// Every entry of table T-109 with every surface its first cell names.
const ENTRIES: { id: string; surfaces: string[] }[] = (SPEC['T-109'] ?? [])
  .filter((row) => /^IC-\d+$/.test(row.id))
  .map((row) => ({ id: row.id, surfaces: spans(row.cells[0] ?? '') }))
  .filter((row) => row.surfaces.length > 0)

const KEYS: string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  ...'0123456789'.split(''),
  '+', '-', '=', ' ', '/', '[', ']',
  'Enter', 'Esc', 'Delete', 'Backspace', 'Tab', 'F1', 'F2', 'F11',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown',
  'Control', 'Shift', 'Alt', 'Meta',
]
const KEY_MODS = ['', 'c', 's', 'cs', 'a']

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const fileOf = (text: string, fileName: string): Any => ({ ok: true, file: { bytes: utf8(text), fileName } })
const faultOf = (reason: string): Any => ({ ok: false, fault: { reason, what: 'fake ' + reason } })

// ---------------------------------------------------------------------------
// Helpers over a running bench
// ---------------------------------------------------------------------------

function emptyChartPoint(b: Bench): { x: number; y: number } {
  const v = b.values()
  if (v === null || v === undefined || v.regions === undefined) return { x: 700, y: 600 }
  const area = v.regions.taskGroupArea
  return { x: Math.round(area.x + area.width - 30), y: Math.round(area.y + area.height - 20) }
}

function chartCenter(b: Bench): { x: number; y: number } {
  const v = b.values()
  if (v === null || v === undefined || v.regions === undefined) return { x: 600, y: 400 }
  const area = v.regions.taskGroupArea
  return { x: Math.round(area.x + area.width / 2), y: Math.round(area.y + area.height / 2) }
}

function panelPoint(b: Bench): { x: number; y: number } {
  const v = b.values()
  if (v === null || v === undefined || v.regions === undefined) return { x: 60, y: 300 }
  const area = v.regions.taskGroupPanel
  return { x: Math.round(area.x + area.width / 2), y: Math.round(area.y + area.height / 2) }
}

function pointOf(b: Bench, uid: number, figure = 'plan', where = 'middle'): { x: number; y: number } | null {
  return b.barPoints().find((p) => p.uid === uid && p.figure === figure && p.where === where) ?? null
}

async function selectTask(b: Bench, uid: number, modifiers: Modifiers = mods('')): Promise<void> {
  const p = pointOf(b, uid) ?? pointOf(b, uid, 'milestone') ?? pointOf(b, uid, 'actual')
  if (p === null) {
    b.record('select.missing', uid)
    return
  }
  await b.click(p.x, p.y, null, { modifiers })
}

async function escapes(b: Bench, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) await b.key('Esc')
}

interface FieldControl {
  readonly row: string
  readonly key: Any
  readonly kind: string
  readonly text: string
  readonly choices: string[]
  readonly min: number | null
  readonly max: number | null
  readonly press: string | null
  readonly swatches: string[]
}

function fieldControls(view: Any): FieldControl[] {
  const panel = view?.propertiesPanel
  if (panel === null || panel === undefined) return []
  const out: FieldControl[] = []
  for (const field of panel.fields ?? []) {
    for (const control of field.controls ?? []) {
      out.push({
        row: field.row,
        key: control.key,
        kind: control.kind,
        text: control.text ?? '',
        choices: [...(control.choiceValues ?? control.choices ?? [])],
        min: control.min ?? null,
        max: control.max ?? null,
        press: control.press ?? null,
        swatches: [...(control.swatches ?? control.color?.swatches ?? [])],
      })
    }
  }
  return out
}

function commitTexts(control: FieldControl): string[] {
  if (control.press !== null) return [control.press]
  switch (control.kind) {
    case 'text':
    case 'multiline':
      return [control.text + ' X', '', '  padded  ']
    case 'date':
      return ['2026-04-03', '2026-04-03T10:30:00', '', 'not a date', '2027-12-31']
    case 'number': {
      const min = control.min ?? 0
      const max = control.max ?? 100
      return [String(min), String(min - 1), String(max), String(max + 1), '', 'x', '1.5']
    }
    case 'boolean':
      return ['true', 'false']
    case 'choice':
      return control.choices.slice(0, 4)
    case 'color':
      return ['#123456', 'bad', '', ...control.swatches.slice(0, 1)]
    case 'taskReference':
      return ['1', '99', '']
    default:
      return [control.text + '1', '']
  }
}

async function commitField(b: Bench, control: FieldControl, text: string): Promise<void> {
  b.editNotices.push({ kind: 'began', row: control.row })
  b.commits.push({ row: control.row, key: control.key, text })
  b.editNotices.push({ kind: 'ended', row: control.row })
  b.record('step.commit', control.row, control.key, text)
  b.call('pressContinued', () => b.loop.pressContinued())
  await b.flush()
}

function noticeKeys(view: Any): string[] {
  return (view?.notices ?? []).map((n: Any) => n.dismissKey).filter((k: unknown) => typeof k === 'string')
}

function searchTargets(view: Any): Any[] {
  return (view?.searchPanel?.rows ?? []).map((row: Any) => row.target).filter((t: unknown) => t !== undefined)
}

function columnsOf(view: Any, which = 'searchPanel'): string[] {
  return (view?.[which]?.columns ?? []).map((c: Any) => c.column ?? c.key ?? c.id).filter((c: unknown) => typeof c === 'string')
}

// ---------------------------------------------------------------------------
// Scenario families
// ---------------------------------------------------------------------------

function startCases(out: Scenario[]): void {
  for (const doc of ['two', 'rich', 'trimmed', 'template', 'empty']) {
    out.push({ id: `start.${doc}`, options: { doc }, run: async () => {} })
  }
  for (const [id, options] of [
    ['ja', { doc: 'two', language: 'ja' }],
    ['dark', { doc: 'two', theme: 'dark' }],
    ['system', { doc: 'two', theme: 'system' }],
    ['wide', { doc: 'rich', env: WIDE }],
    ['no-screen', { doc: 'two', screen: false }],
    ['no-optional-seams', { doc: 'two', optionalSeams: false }],
    ['no-hosts', { doc: 'two', files: false, clipboard: false, rasterizer: false, appShell: false, emptyDocument: false, fullScreen: false, pageReload: false, pointerShape: false }],
    ['from-template', { doc: 'two', startedFromTemplate: true }],
    ['stored-values', { doc: 'two', storage: { 'grs.openedBy': 'Stored Name', 'grs.agentApiEnabled': 'true' } }],
    ['unsettled', { doc: 'two', env: UNSETTLED }],
  ] as const) {
    out.push({ id: `start.variant.${id}`, options: options as BenchOptions, run: async () => {} })
  }
  out.push({
    id: 'start.unsettled-then-settle', options: { doc: 'two', env: UNSETTLED }, run: async (b) => {
      b.input(keyInput('P'))
      await b.flush()
      b.call('settleFirstFrameEnvironment', () => b.loop.settleFirstFrameEnvironment(SCREEN))
      await b.flush()
      b.call('settleFirstFrameEnvironment.again', () => b.loop.settleFirstFrameEnvironment(SCREEN))
      await b.flush()
      b.call('resize', () => b.loop.resize(WIDE))
      await b.flush()
    },
  })
  out.push({
    id: 'start.unsettled-then-resize', options: { doc: 'rich', env: UNSETTLED }, run: async (b) => {
      b.call('resize', () => b.loop.resize(SCREEN))
      await b.flush()
      b.call('resize.same', () => b.loop.resize(SCREEN))
      await b.flush()
      b.call('resize.zero', () => b.loop.resize(UNSETTLED))
      await b.flush()
      b.call('resize.back', () => b.loop.resize(WIDE))
      await b.flush()
    },
  })
}

function keyCases(out: Scenario[]): void {
  for (const [variant, doc, selected] of [['plain', 'two', null], ['selected', 'rich', 2]] as const) {
    for (const key of KEYS) {
      for (const m of KEY_MODS) {
        out.push({
          id: `key.${variant}.${key === ' ' ? 'Space' : key}.${m || 'none'}`,
          options: { doc },
          run: async (b) => {
            if (selected !== null) await selectTask(b, selected)
            await b.key(key, mods(m))
            await b.key('Esc')
            await b.key('Esc')
          },
        })
      }
    }
  }
  // Answering a question: Y / N / Enter / Esc after each way a question is raised.
  for (const answer of ['Y', 'N', 'Enter', 'Esc', 'Q']) {
    out.push({
      id: `key.confirm.new-document.${answer}`, options: { doc: 'rich' }, run: async (b) => {
        await selectTask(b, 2)
        await b.key('Delete')
        await b.entry('IC-98', 'App Header')
        await b.key(answer)
        await b.key('Esc')
      },
    })
    out.push({
      id: `key.confirm.delete-group.${answer}`, options: { doc: 'rich' }, run: async (b) => {
        const rows = b.rowPoints()
        const row = rows[0]
        await b.click(row?.x ?? 40, row?.y ?? 200, part('Task Group Panel', { taskGroupId: row?.taskGroupId ?? null, entry: 'IC-82' }))
        await b.key(answer)
      },
    })
    out.push({
      id: `key.confirm.delete-all-groups.${answer}`, options: { doc: 'rich' }, run: async (b) => {
        await b.entry('IC-106', 'Task Group Panel')
        await b.key(answer)
      },
    })
  }
}

function entryCases(out: Scenario[]): void {
  for (const one of ENTRIES) {
    for (const surface of one.surfaces) {
      const tag = surface.replace(/\s+/g, '')
      out.push({
        id: `entry.plain.${one.id}.${tag}`, options: { doc: 'two' }, run: async (b) => {
          await b.entry(one.id, surface)
          await b.key('Esc')
          const p = emptyChartPoint(b)
          await b.click(p.x, p.y)
        },
      })
      out.push({
        id: `entry.selected.${one.id}.${tag}`, options: { doc: 'rich' }, run: async (b) => {
          await selectTask(b, 2)
          await selectTask(b, 3, mods('c'))
          await selectTask(b, 5, mods('s'))
          await b.entry(one.id, surface)
          await b.entry(one.id, surface)
          await b.key('Esc')
        },
      })
    }
  }
  // Armed entries then a press on the chart: placing shapes, boxes, links and cursors.
  const armed = ['IC-23', 'IC-24', 'IC-25', 'IC-26', 'IC-27', 'IC-30', 'IC-89', 'IC-61', 'IC-35', 'IC-36', 'IC-44', 'IC-45', 'IC-47', 'IC-48', 'IC-142']
  for (const id of armed) {
    for (const how of ['click', 'drag', 'on-bar', 'twice']) {
      out.push({
        id: `entry.armed.${id}.${how}`, options: { doc: 'rich' }, run: async (b) => {
          await b.entry(id, 'Command Palette')
          const c = chartCenter(b)
          const bar = pointOf(b, 3) ?? c
          const bar2 = pointOf(b, 6) ?? { x: c.x + 50, y: c.y + 40 }
          if (how === 'click') await b.click(c.x, c.y)
          if (how === 'drag') await b.drag(c, { x: c.x + 80, y: c.y + 30 })
          if (how === 'on-bar') await b.drag(bar, bar2)
          if (how === 'twice') {
            await b.click(c.x, c.y)
            await b.click(c.x + 60, c.y + 20)
          }
          await b.key('Esc')
        },
      })
    }
  }
  // Palette grab band drag and minimize.
  for (const [dx, dy] of [[-200, 0], [0, 150], [3000, 3000], [-3000, -3000], [2, 2]] as const) {
    out.push({
      id: `entry.palette-drag.${dx}.${dy}`, options: { doc: 'two' }, run: async (b) => {
        const at = b.lastView?.commandPalette?.at ?? { x: 900, y: 100 }
        const from = { x: at.x + 10, y: at.y + 5 }
        await b.drag(from, { x: from.x + dx, y: from.y + dy }, { on: part('Command Palette', { entry: 'IC-53' }) })
        b.call('resize', () => b.loop.resize({ ...SCREEN, width: 700, height: 500 }))
        await b.flush()
        await b.entry('IC-75', 'Command Palette')
        await b.entry('IC-75', 'Command Palette')
      },
    })
  }
}

// WHY: the points are found by drawing each document once before the cases are listed, so a case is
// made only for a figure the document draws; a case for an undrawn figure would record nothing.
export interface Found {
  readonly [doc: string]: { readonly bars: Any[]; readonly rows: Any[]; readonly boxes: Any[] }
}

function dragCases(out: Scenario[], found: Found): void {
  const plans: [string, string, number[], string[], number[]][] = [
    ['two', 'two', [1, 2], ['', 'c', 's', 'a'], [-60, -13, -4, -1, 1, 4, 13, 60]],
    ['rich', 'rich', [1, 2, 3, 4, 5, 6], ['', 'c', 's', 'a'], [-25, 25]],
  ]
  for (const [tag, doc, uids, modsList, dxs] of plans) {
    for (const point of (found[doc]?.bars ?? []).filter((p) => uids.includes(p.uid))) {
      const { uid, figure, where } = point as { uid: number; figure: string; where: string }
      {
        {
          for (const m of modsList) {
            for (const dx of dxs) {
              out.push({
                id: `drag.${tag}.${uid}.${figure}.${where}.${m || 'none'}.${dx}`, options: { doc }, run: async (b) => {
                  const p = pointOf(b, uid, figure, where)
                  if (p === null) {
                    b.record('no-point', uid, figure, where)
                    return
                  }
                  await b.drag(p, { x: p.x + dx, y: p.y }, { modifiers: mods(m) })
                },
              })
            }
          }
          out.push({
            id: `drag.${tag}.${uid}.${figure}.${where}.vertical`, options: { doc }, run: async (b) => {
              const p = pointOf(b, uid, figure, where)
              if (p === null) return b.record('no-point')
              await b.drag(p, { x: p.x + 10, y: p.y + 45 })
              await b.drag(p, { x: p.x, y: p.y - 45 })
            },
          })
          for (const end of ['lost', 'esc'] as const) {
            out.push({
              id: `drag.${tag}.${uid}.${figure}.${where}.end-${end}`, options: { doc }, run: async (b) => {
                const p = pointOf(b, uid, figure, where)
                if (p === null) return b.record('no-point')
                await b.drag(p, { x: p.x + 30, y: p.y }, { end })
              },
            })
          }
          for (const [clickId, options] of [
            ['click', {}], ['double', { clickCount: 2 }], ['ctrl', { modifiers: mods('c') }], ['shift', { modifiers: mods('s') }],
            ['right', { button: 'right' }], ['middle', { button: 'middle' }],
          ] as const) {
            out.push({
              id: `click.${tag}.${uid}.${figure}.${where}.${clickId}`, options: { doc }, run: async (b) => {
                const p = pointOf(b, uid, figure, where)
                if (p === null) return b.record('no-point')
                await b.click(p.x, p.y, null, options as Any)
                await b.key('Delete')
                await b.key('Esc')
              },
            })
          }
        }
      }
    }
  }
  // Empty chart: marquee, pan, presses at the edges.
  for (const [id, from, to, m, button] of [
    ['marquee-all', 'corner', 'origin', '', 'left'],
    ['marquee-ctrl', 'corner', 'origin', 'c', 'left'],
    ['marquee-shift', 'corner', 'origin', 's', 'left'],
    ['pan-middle', 'center', 'shifted', '', 'middle'],
    ['pan-right', 'center', 'shifted', '', 'right'],
    ['still', 'center', 'center', '', 'left'],
  ] as const) {
    for (const doc of ['two', 'rich']) {
      out.push({
        id: `drag.empty.${doc}.${id}`, options: { doc }, run: async (b) => {
          const corner = emptyChartPoint(b)
          const c = chartCenter(b)
          const v = b.values()
          const origin = v?.regions ? { x: v.regions.taskGroupArea.x + 2, y: v.regions.taskGroupArea.y + 2 } : { x: 200, y: 100 }
          const pick = (w: string): { x: number; y: number } => (w === 'corner' ? corner : w === 'origin' ? origin : w === 'center' ? c : { x: c.x - 120, y: c.y - 60 })
          const start = pick(from)
          const end = pick(to)
          b.partAt = () => null
          b.input(pointerInput('down', start.x, start.y, { modifiers: mods(m), button }))
          await b.flush()
          b.input(pointerInput('move', (start.x + end.x) / 2, (start.y + end.y) / 2, { modifiers: mods(m), button }))
          await b.flush()
          b.input(pointerInput('move', end.x, end.y, { modifiers: mods(m), button }))
          await b.flush()
          b.input(pointerInput('up', end.x, end.y, { modifiers: mods(m), button }))
          await b.flush()
          await b.key('Delete')
        },
      })
    }
  }
}

function boxCases(out: Scenario[], found: Found): void {
  for (const point of found['rich']?.boxes ?? []) {
    const tag = `box.${point.kind}.${String(point.id).slice(0, 8)}.${point.where}`
    for (const [dx, dy] of [[20, 0], [-20, 15], [0, -30], [1, 1]] as const) {
      for (const m of ['', 'c', 's']) {
        out.push({
          id: `${tag}.drag.${dx}.${dy}.${m || 'none'}`, options: { doc: 'rich' }, run: async (b) => {
            await b.drag(point, { x: point.x + dx, y: point.y + dy }, { modifiers: mods(m) })
            await b.key('Z', mods('c'))
          },
        })
      }
    }
    for (const [clickId, options] of [['click', {}], ['double', { clickCount: 2 }], ['ctrl', { modifiers: mods('c') }]] as const) {
      out.push({
        id: `${tag}.${clickId}`, options: { doc: 'rich' }, run: async (b) => {
          await b.click(point.x, point.y, null, options as Any)
          await b.key('C', mods('c'))
          await b.key('V', mods('c'))
          await b.key('Delete')
          await b.key('Esc')
        },
      })
    }
  }
}

function rowCases(out: Scenario[], found: Found): void {
  for (const doc of ['two', 'rich']) {
    for (let at = 0; at < (found[doc]?.rows.length ?? 0); at += 1) {
      for (const [id, run] of [
        ['click', async (b: Bench, row: Any) => b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId }))],
        ['double', async (b: Bench, row: Any) => b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId }), { clickCount: 2 })],
        ['ctrl', async (b: Bench, row: Any) => {
          await b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId }))
          await b.click(row.x, row.y + 30, part('Task Group Panel', { taskGroupId: b.rowPoints()[at + 1]?.taskGroupId ?? row.taskGroupId }), { modifiers: mods('c') })
        }],
        ['shift', async (b: Bench, row: Any) => b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId }), { modifiers: mods('s') })],
        ...[-40, -12, -1, 1, 12, 40, 90].map((dy) => [`grab${dy}`, async (b: Bench, row: Any) =>
          b.drag(row, { x: row.x, y: row.y + dy }, { on: part('Task Group Panel', { taskGroupId: row.taskGroupId, isTaskGroupGrabStrip: true }), steps: 4 })] as const),
        ['grab-right', async (b: Bench, row: Any) =>
          b.drag(row, { x: row.x + 60, y: row.y + 20 }, { on: part('Task Group Panel', { taskGroupId: row.taskGroupId, isTaskGroupGrabStrip: true }), steps: 4 })],
        ['grab-esc', async (b: Bench, row: Any) =>
          b.drag(row, { x: row.x, y: row.y + 25 }, { on: part('Task Group Panel', { taskGroupId: row.taskGroupId, isTaskGroupGrabStrip: true }), end: 'esc' })],
        ['body-drag', async (b: Bench, row: Any) =>
          b.drag(row, { x: row.x, y: row.y + 25 }, { on: part('Task Group Panel', { taskGroupId: row.taskGroupId }) })],
        ...['IC-58', 'IC-59', 'IC-77', 'IC-90', 'IC-91', 'IC-60', 'IC-82'].map((icon) => [`entry-${icon}`, async (b: Bench, row: Any) => {
          await b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId, entry: icon }))
          await b.key('Y')
        }] as const),
      ] as const) {
        out.push({
          id: `row.${doc}.${at}.${id}`, options: { doc }, run: async (b) => {
            const row = b.rowPoints()[at]
            if (row === undefined) return b.record('no-row', at)
            await run(b, row)
            await b.key('F2')
            await b.key('Esc')
          },
        })
      }
    }
  }
  // Edge scroll: carry a grabbed row to the bottom edge and let time pass.
  for (const ms of [0, 100, 500, 2000]) {
    out.push({
      id: `row.edge-scroll.${ms}`, options: { doc: 'trimmed' }, run: async (b) => {
        const row = b.rowPoints()[1]
        const v = b.values()
        if (row === undefined || v === null) return b.record('no-row')
        const bottom = v.regions.taskGroupArea.y + v.regions.taskGroupArea.height - 2
        b.partAt = () => part('Task Group Panel', { taskGroupId: row.taskGroupId, isTaskGroupGrabStrip: true })
        b.input(pointerInput('down', row.x, row.y))
        await b.flush()
        b.input(pointerInput('move', row.x, row.y + 20))
        await b.flush()
        b.input(pointerInput('move', row.x, bottom))
        await b.flush(ms)
        b.call('pressContinued', () => b.loop.pressContinued())
        await b.flush(ms)
        b.input(pointerInput('up', row.x, bottom))
        await b.flush()
      },
    })
  }
}

// Edge scroll over the whole template (100 task groups, so there is room to scroll), frame after frame
// with time passing between, at the bottom and the top edge; and a change of the controls' height alone.
function edgeScrollCases(out: Scenario[]): void {
  for (const edge of ['bottom', 'top']) {
    for (const stepMs of [16, 50, 250]) {
      out.push({
        id: `row.edge-scroll-template.${edge}.${stepMs}`, options: { doc: 'template' }, run: async (b) => {
          const rows = b.rowPoints()
          const row = edge === 'bottom' ? rows[2] : rows[rows.length - 3]
          const v = b.values()
          if (row === undefined || v === null) return b.record('no-row')
          const area = v.regions.taskGroupArea
          if (edge === 'top') await b.wheel(row.x, area.y + 50, 10, { x: 0, y: 3000 })
          const target = edge === 'bottom' ? area.y + area.height - 2 : area.y + 2
          b.partAt = () => part('Task Group Panel', { taskGroupId: row.taskGroupId, isTaskGroupGrabStrip: true })
          b.input(pointerInput('down', row.x, row.y))
          await b.flush()
          b.input(pointerInput('move', row.x, row.y + (edge === 'bottom' ? 20 : -20)))
          await b.flush()
          b.input(pointerInput('move', row.x, target))
          for (let frame = 0; frame < 6; frame += 1) await b.flush(stepMs)
          b.input(pointerInput('up', row.x, target))
          await b.flush()
        },
      })
    }
  }
  for (const height of [0, 24, 40]) {
    out.push({
      id: `resize.controls-height.${height}`, options: { doc: 'rich', env: { ...SCREEN, taskGroupControlsHeightPx: 24 } }, run: async (b) => {
        b.call('resize', () => b.loop.resize({ ...SCREEN, taskGroupControlsHeightPx: height }))
        await b.flush()
        b.call('resize.band', () => b.loop.resize({ ...SCREEN, taskGroupControlsHeightPx: height, commandPaletteBandPx: { width: 100, height: 300 } }))
        await b.flush()
      },
    })
  }
}

function wheelCases(out: Scenario[]): void {
  const places: [string, (b: Bench) => { x: number; y: number }, Part | null][] = [
    ['chart', chartCenter, null],
    ['panel', panelPoint, null],
    ['panel-part', panelPoint, part('Task Group Panel', { taskGroupId: null })],
    ['header', () => ({ x: 300, y: 20 }), part('App Header')],
    ['palette', () => ({ x: 950, y: 200 }), part('Command Palette')],
  ]
  for (const [placeId, where, on] of places) {
    for (const notches of [-3, -1, 1, 3]) {
      for (const m of ['', 'c', 's', 'a', 'cs']) {
        out.push({
          id: `wheel.${placeId}.${notches}.${m || 'none'}`, options: { doc: 'rich' }, run: async (b) => {
            const p = where(b)
            await b.wheel(p.x, p.y, notches, { x: 0, y: notches * 100 }, mods(m), on)
            await b.wheel(p.x, p.y, notches, { x: 0, y: notches * 100 }, mods(m), on)
          },
        })
      }
    }
  }
  for (const [sx, sy] of [[0, 30], [0, -30], [40, 0], [-40, 0], [15, 15], [0, 4000], [0, -4000], [0, 0.5]] as const) {
    out.push({
      id: `wheel.trackpad.${sx}.${sy}`, options: { doc: 'rich' }, run: async (b) => {
        const p = chartCenter(b)
        await b.wheel(p.x, p.y, 0, { x: sx, y: sy })
      },
    })
  }
  for (const steps of [5, 12, 40]) {
    out.push({
      id: `wheel.zoom-limit.${steps}`, options: { doc: 'two' }, run: async (b) => {
        const p = chartCenter(b)
        for (let i = 0; i < steps; i += 1) await b.wheel(p.x, p.y, -1, { x: 0, y: -100 }, mods('c'))
        for (let i = 0; i < steps; i += 1) await b.wheel(p.x, p.y, 1, { x: 0, y: 100 }, mods('a'))
      },
    })
  }
}

function fieldCases(out: Scenario[]): void {
  const prefixes: [string, string, (b: Bench) => Promise<void>][] = [
    ['settings', 'two', async (b) => b.entry('IC-17', 'App Header')],
    ['task', 'rich', async (b) => {
      const p = pointOf(b, 2)
      if (p !== null) await b.click(p.x, p.y, null, { clickCount: 2 })
    }],
    ['task-double', 'rich', async (b) => {
      const p = pointOf(b, 3)
      if (p !== null) await b.click(p.x, p.y, null, { clickCount: 2 })
    }],
    ['milestone', 'rich', async (b) => {
      const p = pointOf(b, 4, 'milestone')
      if (p !== null) await b.click(p.x, p.y, null, { clickCount: 2 })
    }],
    ['two-tasks', 'rich', async (b) => {
      await selectTask(b, 2)
      const p = pointOf(b, 3)
      if (p !== null) await b.click(p.x, p.y, null, { clickCount: 2, modifiers: mods('c') })
    }],
    ['comment', 'rich', async (b) => {
      const p = b.boxPoints().find((one) => one.kind === 'comment' && one.where === 'body')
      if (p !== undefined) await b.click(p.x, p.y, null, { clickCount: 2 })
    }],
    ['highlight', 'rich', async (b) => {
      const p = b.boxPoints().find((one) => one.kind === 'highlight' && one.where === 'left')
      if (p !== undefined) await b.click(p.x, p.y, null, { clickCount: 2 })
    }],
    ['link', 'rich', async (b) => {
      const dep = b.values()?.geometry?.dependencies?.[0]
      const pts = dep?.points ?? dep?.path?.points ?? []
      const mid = pts[Math.floor(pts.length / 2)]
      if (mid !== undefined) await b.click(mid.x, mid.y, null, { clickCount: 2 })
    }],
    ['group', 'rich', async (b) => {
      const row = b.rowPoints()[1]
      if (row !== undefined) await b.click(row.x, row.y, part('Task Group Panel', { taskGroupId: row.taskGroupId }), { clickCount: 2 })
    }],
  ]
  for (const [prefixId, doc, prefix] of prefixes) {
    out.push({
      id: `field.${prefixId}.view`, options: { doc }, run: async (b) => {
        await prefix(b)
        b.record('fields', fieldControls(b.lastView).map((c) => [c.row, c.kind]))
      },
    })
    const slots = ['settings', 'task', 'task-double', 'milestone', 'highlight'].includes(prefixId) ? 24 : 0
    for (let at = 0; at < slots; at += 1) {
      out.push({
        id: `field.${prefixId}.${at}`, options: { doc }, run: async (b) => {
          await prefix(b)
          const control = fieldControls(b.lastView)[at]
          if (control === undefined) return b.record('no-field', at)
          for (const text of commitTexts(control)) {
            await commitField(b, control, text)
            await b.key('Z', mods('c'))
          }
          await b.key('Y', mods('c'))
          await b.key('Esc')
        },
      })
    }
  }
  out.push({
    id: 'field.focus-refused', options: { doc: 'rich' }, run: async (b) => {
      b.focusAccepts = false
      await selectTask(b, 2)
      await b.key('F2')
      await b.key('Enter')
      await b.flush(1000)
    },
  })
  out.push({
    id: 'field.watermark-unlock', options: { doc: 'two' }, run: async (b) => {
      await b.entry('IC-41', 'Command Palette')
      await b.entry('IC-41', 'Command Palette')
      b.watermarkAnswer = 'wrong'
      await b.click(500, 300, part('Watermark Unlock', { confirmationAnswer: 'proceed' }))
      b.watermarkAnswer = ''
      await b.key('Enter')
      await b.key('Esc')
    },
  })
}

function fileCases(out: Scenario[]): void {
  const richText = JSON.stringify(richDocument())
  const twoText = JSON.stringify(twoGroupDocument())
  const opens: [string, Any][] = [
    ['json', fileOf(richText, 'rich.json')],
    ['json-same', fileOf(twoText, 'two.json')],
    ['mspdi', fileOf(SMALL_XML, 'small.xml')],
    ['garbage', fileOf('not a document {', 'bad.json')],
    ['empty-bytes', fileOf('', 'empty.json')],
    ['html', fileOf('<!doctype html><html><body><script id="embedded-document" type="application/json">' + twoText + '</script></body></html>', 'page.html')],
    ['canceled', faultOf('canceled')],
    ['permission', faultOf('permissionLost')],
    ['unavailable', faultOf('unavailable')],
  ]
  for (const [openId, reply] of opens) {
    for (const answer of ['IC-71', 'IC-72', 'IC-73', 'Esc', 'none']) {
      out.push({
        id: `file.open.${openId}.${answer}`, options: { doc: 'two' }, run: async (b) => {
          b.fileReads.push(reply)
          await b.key('O', mods('c'))
          await b.flush()
          if (answer === 'Esc') await b.key('Esc')
          else if (answer !== 'none') await b.entry(answer, 'Open Chooser')
          await b.flush()
          for (const answerId of ['IC-95', 'IC-96']) {
            if (b.lastView?.openModal !== null && b.lastView?.openModal !== undefined) await b.entry(answerId, 'Difference Review')
          }
          await b.key('Enter')
          await b.flush()
        },
      })
    }
  }
  for (const answer of ['Y', 'N', 'proceed', 'cancel']) {
    out.push({
      id: `file.open-over-edits.${answer}`, options: { doc: 'rich' }, run: async (b) => {
        await selectTask(b, 2)
        await b.key('Delete')
        b.fileReads.push(fileOf(twoText, 'two.json'))
        await b.entry('IC-1', 'App Header')
        await b.entry('IC-71', 'Open Chooser')
        if (answer.length === 1) await b.key(answer)
        else await b.click(500, 300, part('Confirmation', { confirmationAnswer: answer }))
        await b.flush()
      },
    })
  }
  const saves: [string, Any, Any[], Any][] = [
    ['none', { kind: 'none' }, [], null],
    ['writable', { kind: 'writable', fileName: 'two.json' }, [], null],
    ['writable-fault', { kind: 'writable', fileName: 'two.json' }, [faultOf('permissionLost')], null],
    ['writable-unavailable', { kind: 'writable', fileName: 'two.json' }, [faultOf('unavailable')], null],
    ['lost', { kind: 'permissionLost', fileName: 'two.json' }, [], { kind: 'writable', fileName: 'two.json' }],
    ['lost-still', { kind: 'permissionLost', fileName: 'two.json' }, [], { kind: 'permissionLost', fileName: 'two.json' }],
  ]
  for (const [saveId, state, replies, restore] of saves) {
    for (const edited of [false, true]) {
      out.push({
        id: `file.save.${saveId}.${edited ? 'edited' : 'clean'}`, options: { doc: 'rich' }, run: async (b) => {
          b.openedState = state
          for (const r of replies) b.overwriteReplies.push(r)
          b.restoreReply = restore
          if (edited) {
            await selectTask(b, 3)
            await b.key('Delete')
          }
          await b.key('S', mods('c'))
          await b.flush()
          await b.key('Y')
          await b.flush()
          await b.key('S', mods('c'))
          await b.flush()
        },
      })
    }
  }
  for (const [chosenId, destination, reply] of [
    ['empty', { kind: 'empty' }, null],
    ['occupied', { kind: 'occupied', fileName: 'x.json', bytes: utf8('{}') }, null],
    ['canceled', { kind: 'empty' }, faultOf('canceled')],
    ['unavailable', { kind: 'empty' }, faultOf('unavailable')],
  ] as const) {
    out.push({
      id: `file.save-chosen.${chosenId}`, options: { doc: 'rich' }, run: async (b) => {
        b.writeOverDestination = destination
        if (reply !== null) b.chosenReplies.push(reply)
        await b.key('S', mods('c'))
        await b.flush()
        await b.key('Y')
        await b.flush()
      },
    })
  }
  for (let io = 1; io <= 9; io += 1) {
    for (const [hostId, options] of [
      ['all', {}],
      ['no-raster', { rasterizer: false }],
      ['raster-fault', { rasterFault: 'tooLarge' }],
      ['shell-fault', { appShell: 'fault' }],
      ['no-shell', { appShell: false }],
    ] as const) {
      out.push({
        id: `file.export.IO-${io}.${hostId}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
          await b.entry('IC-2', 'App Header')
          await b.click(500, 300, part('Export Chooser', { format: `IO-${io}` }))
          await b.flush()
          await b.key('Y')
          await b.flush()
        },
      })
    }
  }
  out.push({
    id: 'file.export-shortcut', options: { doc: 'rich' }, run: async (b) => {
      await b.key('E', mods('cs'))
      await b.click(500, 300, part('Export Chooser', { entry: 'IC-52' }))
      await b.key('E', mods('cs'))
      await b.key('Esc')
    },
  })
  for (const [id, options] of [
    ['ok', {}], ['clip-fault', { clipboardFault: 'notPermitted' }], ['no-clip', { clipboard: false }], ['raster-fault', { rasterFault: 'rasterFailed' }], ['no-raster', { rasterizer: false }],
  ] as const) {
    out.push({
      id: `file.copy-picture.${id}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
        await b.entry('IC-3', 'App Header')
        await b.flush(100)
      },
    })
    out.push({
      id: `file.copy-prompt.${id}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
        await b.entry('IC-115', 'App Header')
        await b.flush(100)
      },
    })
    out.push({
      id: `file.copy-paste.${id}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
        await selectTask(b, 2)
        await b.key('C', mods('c'))
        await b.key('V', mods('c'))
        await b.key('V', mods('c'))
        await b.key('Z', mods('c'))
      },
    })
  }
  for (const [dropId, reply] of [['json', fileOf(richText, 'drop.json')], ['xml', fileOf(SMALL_XML, 'drop.xml')], ['fault', faultOf('canceled')]] as const) {
    out.push({
      id: `file.drop.${dropId}`, options: { doc: 'two' }, run: async (b) => {
        b.call('fileDragMoved.in', () => b.loop.fileDragMoved(true))
        await b.flush()
        b.call('fileDragMoved.in2', () => b.loop.fileDragMoved(true))
        await b.flush()
        b.fileReads.push(reply)
        b.call('fileDropped', () => b.loop.fileDropped())
        await b.flush()
        await b.entry('IC-72', 'Open Chooser')
        b.call('fileDragMoved.out', () => b.loop.fileDragMoved(false))
        await b.flush()
      },
    })
  }
  out.push({
    id: 'file.drag-out', options: { doc: 'two' }, run: async (b) => {
      b.call('fileDragMoved.in', () => b.loop.fileDragMoved(true))
      await b.flush()
      b.call('fileDragMoved.out', () => b.loop.fileDragMoved(false))
      await b.flush()
      b.call('fileDropped.nothing', () => b.loop.fileDropped())
      await b.flush()
    },
  })
  for (const [baseId, reply] of [['json', fileOf(richText, 'base.json')], ['fault', faultOf('canceled')]] as const) {
    out.push({
      id: `file.baseline.${baseId}`, options: { doc: 'rich' }, run: async (b) => {
        b.fileReads.push(reply)
        await b.entry('IC-4', 'App Header')
        await b.entry('IC-73', 'Open Chooser')
        await b.entry('IC-4', 'App Header')
        await b.entry('IC-4', 'App Header')
      },
    })
  }
  for (const [newId, edited, answer] of [['clean', false, 'none'], ['edited-Y', true, 'Y'], ['edited-N', true, 'N'], ['no-empty', false, 'none']] as const) {
    out.push({
      id: `file.new.${newId}`, options: { doc: 'rich', emptyDocument: newId !== 'no-empty' }, run: async (b) => {
        if (edited) {
          await selectTask(b, 2)
          await b.key('Delete')
        }
        await b.key('N')
        await b.entry('IC-98', 'App Header')
        if (answer !== 'none') await b.key(answer)
      },
    })
  }
  out.push({
    id: 'file.reopen', options: { doc: 'rich' }, run: async (b) => {
      b.openedState = { kind: 'writable', fileName: 'rich.json' }
      b.fileReads.push(fileOf(richText, 'rich.json'))
      await b.key('R', mods('cs'))
      await b.flush()
      b.fileReads.push(fileOf(richText, 'rich.json'))
      await b.key('O', mods('cs'))
      await b.flush()
    },
  })
  out.push({
    id: 'file.hold-document', options: { doc: 'two' }, run: async (b) => {
      b.call('holdDocument', () => b.loop.holdDocument({ row: 'RD-6', document: richDocument() }))
      await b.flush()
      b.call('hasUnsavedEdits', () => b.loop.hasUnsavedEdits())
      await b.key('Z', mods('c'))
    },
  })
}

function noticeCases(out: Scenario[]): void {
  const reasons = ['RS-15', 'RS-21', 'RS-25', 'RS-26', 'RS-48', 'RS-51', 'RS-63', 'RS-64', 'RS-67', 'RS-90']
  for (const reason of reasons) {
    for (const count of [null, 3]) {
      for (const close of ['wait', 'click', 'esc', 'enter']) {
        out.push({
          id: `notice.${reason}.${count ?? 'null'}.${close}`, options: { doc: 'two' }, run: async (b) => {
            b.call('raiseStartupNotice', () => b.loop.raiseStartupNotice(reason, count))
            await b.flush()
            if (close === 'wait') {
              await b.flush(2000)
              await b.flush(8000)
              await b.flush(60000)
            }
            if (close === 'click') {
              const key = noticeKeys(b.lastView)[0] ?? null
              b.partAt = () => part('Notification Area', { noticeDismissKey: key, noticeBoxReasons: [reason] })
              b.input(pointerInput('move', 500, 600))
              await b.flush(5000)
              b.input(pointerInput('down', 500, 600))
              b.input(pointerInput('up', 500, 600))
              await b.flush()
            }
            if (close === 'esc') await b.key('Esc')
            if (close === 'enter') await b.key('Enter')
          },
        })
      }
    }
  }
  out.push({
    id: 'notice.stacked', options: { doc: 'two' }, run: async (b) => {
      for (const reason of reasons) b.call('raise', () => b.loop.raiseStartupNotice(reason))
      await b.flush()
      await escapes(b, 4)
      await b.flush(30000)
    },
  })
  out.push({
    id: 'notice.refused-edits', options: { doc: 'rich' }, run: async (b) => {
      await b.entry('IC-37', 'Command Palette')
      await b.entry('IC-38', 'Command Palette')
      await b.entry('IC-77', 'Task Group Panel')
      await b.flush(10000)
    },
  })
}

function windowCases(out: Scenario[]): void {
  const reportEntries = ['IC-154', 'IC-155', 'IC-156', 'IC-166', 'IC-168', 'IC-108', 'IC-140', 'IC-169', 'IC-159', 'IC-160', 'IC-157', 'IC-158', 'IC-129', 'IC-130', 'IC-131', 'IC-127', 'IC-153', 'IC-143', 'IC-52']
  for (const id of reportEntries) {
    out.push({
      id: `report.${id}`, options: { doc: 'rich' }, run: async (b) => {
        await b.entry('IC-107', 'App Header')
        await b.entry(id, 'Delay Diagnostics Report')
        await b.entry(id, 'Delay Diagnostics Report')
        await b.key('Y')
        await b.entry('IC-107', 'App Header')
      },
    })
  }
  out.push({
    id: 'report.filters', options: { doc: 'rich' }, run: async (b) => {
      await b.entry('IC-107', 'App Header')
      const columns = columnsOf(b.lastView, 'delayDiagnosticsReport')
      b.record('columns', columns)
      for (const column of columns.slice(0, 3)) {
        await b.click(600, 300, part('Delay Diagnostics Report', { entry: 'IC-122', searchFilterColumn: column }))
        b.reportInputs.push({ word: 'B', changes: [{ kind: 'shown', column, keys: [], isShown: false }] })
        b.call('pressContinued', () => b.loop.pressContinued())
        await b.flush()
        await b.click(600, 300, part('Delay Diagnostics Report', { entry: 'IC-123', searchFilterColumn: column }))
        await b.key('Esc')
      }
    },
  })
  out.push({
    id: 'report.marker-and-rows', options: { doc: 'rich' }, run: async (b) => {
      await b.entry('IC-107', 'App Header')
      for (const uid of [2, 3, 5]) {
        const p = pointOf(b, uid, 'marker', 'center')
        if (p !== null) await b.click(p.x, p.y)
      }
      await b.key('Esc')
      await b.key('Esc')
    },
  })
  const searchEntries = ['IC-118', 'IC-119', 'IC-153', 'IC-143', 'IC-129', 'IC-130', 'IC-131', 'IC-127', 'IC-52', 'IC-123', 'IC-124', 'IC-125', 'IC-126']
  for (const id of searchEntries) {
    out.push({
      id: `search.${id}`, options: { doc: 'rich' }, run: async (b) => {
        await b.key('F', mods('c'))
        await b.entry(id, 'Search Panel')
        await b.entry(id, 'Search Panel')
        await b.key('Esc')
      },
    })
  }
  for (const word of ['', 'B', 'Build', 'zzz', 'e', 'Rel']) {
    out.push({
      id: `search.word.${word || 'empty'}`, options: { doc: 'rich' }, run: async (b) => {
        await b.entry('IC-117', 'App Header')
        b.searchWords.push(word)
        b.focusedWindow = 'searchPanel'
        b.call('pressContinued', () => b.loop.pressContinued())
        await b.flush()
        for (const key of ['X', 'Backspace', 'ArrowDown', 'Enter']) await b.key(key)
        const targets = searchTargets(b.lastView)
        b.record('targets', targets)
        for (const target of targets.slice(0, 3)) {
          await b.click(600, 300, part('Search Panel', { searchJumpTarget: target }))
          await b.click(600, 300, part('Search Panel', { searchJumpTarget: target }), { clickCount: 2 })
        }
        b.focusedWindow = null
        await b.key('Esc')
        await b.key('Esc')
      },
    })
  }
  out.push({
    id: 'search.filters', options: { doc: 'rich' }, run: async (b) => {
      await b.key('F', mods('c'))
      const columns = columnsOf(b.lastView)
      b.record('columns', columns)
      for (const column of columns.slice(0, 4)) {
        await b.click(600, 300, part('Search Panel', { entry: 'IC-122', searchFilterColumn: column }))
        b.filterChanges.push({ kind: 'value', column, value: 'Build', isShown: false })
        b.filterChanges.push({ kind: 'bound', column, bound: 'since', day: '2026-04-15' })
        b.call('pressContinued', () => b.loop.pressContinued())
        await b.flush()
        await b.click(600, 300, part('Search Panel', { entry: 'IC-125', searchFilterColumn: column, isInFilterMenu: true }))
        await b.click(600, 300, part('Search Panel', { entry: 'IC-126', searchFilterColumn: column, isInFilterMenu: true }))
        await b.key('Esc')
      }
      await b.entry('IC-153', 'Search Panel')
      await b.entry('IC-143', 'Search Panel')
    },
  })
  const resourceEntries = ['IC-63', 'IC-64', 'IC-65', 'IC-66', 'IC-67', 'IC-68', 'IC-153', 'IC-143', 'IC-129', 'IC-130', 'IC-52']
  for (const id of resourceEntries) {
    out.push({
      id: `resources.${id}`, options: { doc: 'rich' }, run: async (b) => {
        await b.entry('IC-62', 'Command Palette')
        await b.click(600, 300, part('Resource List', { entry: id, resourceUid: 101 }))
        await b.key('Y')
        await b.click(600, 300, part('Resource List', { resourceUid: 101 }))
        await b.click(600, 300, part('Resource List', { resourceUid: 101 }), { modifiers: mods('c') })
        b.resourceInputs.push({ word: 'A', changes: [] })
        b.call('pressContinued', () => b.loop.pressContinued())
        await b.flush()
        await b.key('Delete')
        await b.key('Esc')
      },
    })
  }
  const holidayEntries = ['IC-133', 'IC-134', 'IC-163', 'IC-164', 'IC-165', 'IC-135', 'IC-136', 'IC-137', 'IC-138', 'IC-52']
  for (const id of holidayEntries) {
    out.push({
      id: `holiday.${id}`, options: { doc: 'rich' }, run: async (b) => {
        await b.entry('IC-132', 'Command Palette')
        for (const target of ['1', '3', '0']) await b.click(600, 300, part('Holiday Settings', { entry: id, holidaySettingsTarget: target }))
        await b.click(600, 300, part('Holiday Settings'))
        for (const control of fieldControls({ propertiesPanel: { fields: [] } })) b.record(control)
        await b.entry('IC-138', 'Holiday Settings')
        await b.key('Esc')
      },
    })
  }
  for (const id of ['IC-102', 'IC-128', 'IC-129', 'IC-130', 'IC-131', 'IC-52']) {
    out.push({
      id: `help.${id}`, options: { doc: 'two' }, run: async (b) => {
        await b.key('F1')
        await b.entry(id, 'Help Modal')
        await b.wheel(500, 400, 1, { x: 0, y: 120 }, mods(''), part('Help Modal'))
        b.input(pointerInput('move', 520, 410))
        await b.flush(1500)
        await b.key('Esc')
      },
    })
  }
  // Window title bands grabbed and moved, and a column border dragged.
  for (const [windowId, open, surface] of [['searchPanel', 'IC-117', 'Search Panel'], ['delayDiagnosticsReport', 'IC-107', 'Delay Diagnostics Report'], ['helpModal', 'IC-22', 'Help Modal'], ['resourceList', 'IC-62', 'Resource List']] as const) {
    for (const region of ['titleBand', 'bottomRight', 'right', 'topLeft', 'columnBorder']) {
      out.push({
        id: `window.grab.${windowId}.${region}`, options: { doc: 'rich' }, run: async (b) => {
          await b.entry(open, open === 'IC-62' ? 'Command Palette' : 'App Header')
          const grab = region === 'columnBorder'
            ? { window: windowId, region, column: columnsOf(b.lastView, windowId)[0] ?? 'name', widthAtPress: 120, widthFloor: 40, widthCeiling: 400 }
            : { window: windowId, region, windowBox: { x: 300, y: 150, width: 400, height: 300 }, range: { x: 0, y: 56, width: 1000, height: 644 }, floor: { width: 200, height: 120 } }
          await b.drag({ x: 400, y: 160 }, { x: 250, y: 260 }, { on: part(surface, { windowGrab: grab }) })
          await b.drag({ x: 250, y: 260 }, { x: 2000, y: -500 }, { on: part(surface, { windowGrab: grab }) })
          await b.key('Esc')
        },
      })
    }
  }
}

function fullScreenCases(out: Scenario[]): void {
  for (const host of [true, false]) {
    out.push({
      id: `fullscreen.entry.${host ? 'host' : 'no-host'}`, options: { doc: 'two', fullScreen: host }, run: async (b) => {
        await b.entry('IC-11', 'App Header')
        b.call('fullScreenChanged.true', () => b.loop.fullScreenChanged(true))
        await b.flush()
        await b.key('Esc')
        await b.entry('IC-11', 'App Header')
        b.call('fullScreenChanged.false', () => b.loop.fullScreenChanged(false))
        await b.flush()
      },
    })
    out.push({
      id: `fullscreen.f11.${host ? 'host' : 'no-host'}`, options: { doc: 'two', fullScreen: host }, run: async (b) => {
        await b.key('F11')
        b.call('isBrowserDefaultStopped.f11', () => b.loop.isBrowserDefaultStopped(keyInput('F11')))
        b.call('fullScreenChanged.true', () => b.loop.fullScreenChanged(true))
        b.call('fullScreenChanged.true2', () => b.loop.fullScreenChanged(true))
        await b.flush()
        await b.key('F11')
      },
    })
  }
  out.push({
    id: 'fullscreen.outside-change', options: { doc: 'rich' }, run: async (b) => {
      b.call('fullScreenChanged.false', () => b.loop.fullScreenChanged(false))
      b.call('fullScreenChanged.true', () => b.loop.fullScreenChanged(true))
      await b.flush()
      await b.entry('IC-22', 'App Header')
      await escapes(b, 3)
    },
  })
}

const AGENT_SCHEMA = '2026-10-19T00:35:37Z'

function agentCases(out: Scenario[]): void {
  type AgentRun = (b: Bench, api: Any) => Promise<void>
  const call = (b: Bench, api: Any, name: string, ...args: unknown[]): unknown =>
    b.call(`agent.${name}`, () => api?.[name]?.(...args))
  const callAsync = async (b: Bench, api: Any, name: string, ...args: unknown[]): Promise<unknown> =>
    b.callAsync(`agent.${name}`, async () => api?.[name]?.(...args))
  const stamp = (api: Any): unknown => guarded(() => api.readStamp())
  const runs: [string, AgentRun][] = [
    ['reads', async (b, api) => {
      call(b, api, 'readDocument', false, [], [])
      call(b, api, 'readDocument', true, [2, 3], ['tasks'])
      call(b, api, 'readStamp')
      call(b, api, 'readSelection')
      call(b, api, 'readShownTasks')
      call(b, api, 'readSearchRows', '', 'asShown', 0, 10)
      call(b, api, 'readSearchRows', 'Bu', 'none', 0, 5)
      call(b, api, 'readSearchRows', '', 'asShown', 3, 2)
    }],
    ['tables', async (b, api) => {
      for (const table of ['delayDiagnosticsReport', 'resourceList', 'delayFixProposals', 'delayFixLog']) {
        call(b, api, 'readTableRows', table, '', 'asShown', 0, 20)
        call(b, api, 'readTableRows', table, 'B', 'none', 1, 2)
      }
    }],
    ['diagnostics', async (b, api) => {
      call(b, api, 'readDelayDiagnostics', [], 10)
      call(b, api, 'readDelayDiagnostics', ['summary', 'rows'], 2)
      call(b, api, 'runDelayDiagnostics')
      await b.flush()
      call(b, api, 'readTableRows', 'delayFixProposals', '', 'asShown', 0, 20)
      call(b, api, 'issueDelayFixes', stamp(api), [])
      call(b, api, 'issueDelayFixes', stamp(api), ['nope'])
      await b.flush()
      call(b, api, 'closeWindow', 'delayDiagnosticsReport')
      call(b, api, 'closeWindow', 'propertiesPanel')
      await b.flush()
    }],
    ['apply', async (b, api) => {
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'setTaskName', taskUid: 2, name: 'Renamed' }] })
      await b.flush()
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'setTaskPlanDates', taskUid: 3, start: '2026-05-04T08:00:00', finish: '2026-05-20T17:00:00' }] })
      await b.flush()
      call(b, api, 'applyCommands', { expectedStamp: { scheduleUpdatedAt: 'stale' }, commands: [{ kind: 'setTaskName', taskUid: 2, name: 'Stale' }] })
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'setTaskName', taskUid: 999, name: 'Missing' }] })
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'noSuchCommand' }] })
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [] })
      await b.flush()
      call(b, api, 'undoEdit', stamp(api))
      await b.flush()
      call(b, api, 'redoEdit', stamp(api))
      await b.flush()
      call(b, api, 'undoEdit', { stale: true })
      call(b, api, 'readDocument', false, [2, 3], [])
    }],
    ['apply-while-dragging', async (b, api) => {
      const p = pointOf(b, 2)
      if (p !== null) {
        b.partAt = () => null
        b.input(pointerInput('down', p.x, p.y))
        b.input(pointerInput('move', p.x + 30, p.y))
        await b.flush()
      }
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'setTaskName', taskUid: 2, name: 'During' }] })
      if (p !== null) b.input(pointerInput('up', p.x + 30, p.y))
      await b.flush()
    }],
    ['exports', async (b, api) => {
      call(b, api, 'exportJson')
      call(b, api, 'exportMspdi')
      call(b, api, 'exportSvg')
      call(b, api, 'exportFixLogTsv')
      await callAsync(b, api, 'exportPng')
      await callAsync(b, api, 'exportEmbeddedHtml')
      b.call('exportScene', () => b.loop.exportScene())
    }],
    ['focus-show', async (b, api) => {
      call(b, api, 'focusTask', 3)
      await b.flush()
      call(b, api, 'focusTask', 999)
      call(b, api, 'showOnlyTasks', [2, 3])
      await b.flush()
      call(b, api, 'readShownTasks')
      call(b, api, 'showOnlyTasks', [])
      await b.flush()
      call(b, api, 'focusTask', 7)
      await b.flush()
    }],
    ['import', async (b, api) => {
      await callAsync(b, api, 'importDocument', { text: JSON.stringify(twoGroupDocument()) })
      await b.flush()
      await b.entry('IC-72', 'Open Chooser')
      await callAsync(b, api, 'importDocument', { document: twoGroupDocument() })
      await b.flush()
      await b.entry('IC-71', 'Open Chooser')
      await callAsync(b, api, 'importDocument', { text: 'garbage' })
      await callAsync(b, api, 'importDocument', { text: SMALL_XML.slice(0, 20000) })
      await b.flush()
      call(b, api, 'requestOpenFile')
      await b.flush()
    }],
    ['watch', async (b, api) => {
      const watch = call(b, api, 'watchChanges', (change: unknown) => b.record('agent.change', change)) as Any
      await selectTask(b, 2)
      await b.key('Delete')
      await b.key('Z', mods('c'))
      call(b, api, 'applyCommands', { expectedStamp: stamp(api), commands: [{ kind: 'setTaskName', taskUid: 3, name: 'Watched' }] })
      await b.flush(1000)
      b.call('watch.stop', () => watch?.stop?.() ?? watch?.unwatch?.())
      await b.key('Z', mods('c'))
    }],
  ]
  for (const doc of ['rich', 'two']) {
    for (const [id, run] of runs) {
      out.push({
        id: `agent.${doc}.${id}`, options: { doc }, run: async (b, deps) => {
          b.call('agentApiSeams.keys', () => Object.keys(b.loop.agentApiSeams()).sort())
          const api = b.call('installAgentApi', () => deps.installAgentApi({ ...b.loop.agentApiSeams(), writerName: 'agent', schemaVersion: AGENT_SCHEMA }))
          await run(b, api)
        },
      })
    }
  }
  out.push({
    id: 'agent.seams-direct', options: { doc: 'rich' }, run: async (b) => {
      const seams = b.loop.agentApiSeams()
      b.call('seams.source', () => {
        const source = seams.source
        return Object.fromEntries(Object.keys(source).sort().map((k) => [k, typeof source[k] === 'function' ? guarded(() => source[k]()) : source[k]]))
      })
      b.call('seams.pageFitWrites', () => seams.pageFitWrites?.())
      b.call('seams.askToOpenFile', () => seams.askToOpenFile?.())
      await b.flush()
      b.call('seams.runDelayDiagnostics', () => seams.runDelayDiagnostics?.())
      await b.flush()
      b.call('seams.closeWindow.report', () => seams.closeWindow?.('delayDiagnosticsReport'))
      await b.flush()
      b.call('seams.closeWindow.panel', () => seams.closeWindow?.('propertiesPanel'))
      await b.flush()
      b.call('seams.holder.read', () => seams.holder.read())
      b.call('seams.shownTasks', () => seams.shownTasks?.read?.())
      b.call('seams.delayFixLog', () => typeof seams.delayFixLog)
      b.call('seams.historySteps', () => Object.keys(seams.historySteps ?? {}))
    },
  })
  for (const enabled of [false, true]) {
    out.push({
      id: `agent.enabling.${enabled ? 'stored' : 'fresh'}`, options: { doc: 'two', storage: enabled ? { 'grs.agentApiEnabled': 'true' } : {} }, run: async (b) => {
        b.call('watchAgentApiEnabling', () => b.loop.watchAgentApiEnabling((on: boolean) => b.record('agent.enabling', on)))
        await b.flush()
        await b.entry('IC-20', 'App Header')
        await b.entry('IC-20', 'App Header')
      },
    })
  }
}

function historyCases(out: Scenario[]): void {
  for (const steps of [1, 3, 6]) {
    for (const way of ['keys', 'entries']) {
      out.push({
        id: `history.${way}.${steps}`, options: { doc: 'rich' }, run: async (b) => {
          for (let i = 0; i < steps; i += 1) {
            const p = pointOf(b, 1 + (i % 6))
            if (p !== null) await b.drag(p, { x: p.x + 15, y: p.y })
          }
          for (let i = 0; i <= steps; i += 1) {
            if (way === 'keys') await b.key('Z', mods('c'))
            else await b.entry('IC-5', 'App Header')
          }
          for (let i = 0; i <= steps; i += 1) {
            if (way === 'keys') await b.key('Y', mods('c'))
            else await b.entry('IC-6', 'App Header')
          }
          await b.key('Z', mods('cs'))
        },
      })
    }
  }
  out.push({
    id: 'history.branch', options: { doc: 'rich' }, run: async (b) => {
      await selectTask(b, 2)
      await b.key('Delete')
      await b.key('Z', mods('c'))
      await selectTask(b, 3)
      await b.key('Delete')
      await b.key('Y', mods('c'))
      await b.key('Z', mods('c'))
      await b.key('Z', mods('c'))
    },
  })
}

function clockCases(out: Scenario[]): void {
  for (const ms of [100, 400, 700, 1200, 3000, 10000]) {
    out.push({
      id: `clock.hover-entry.${ms}`, options: { doc: 'two' }, run: async (b) => {
        b.partAt = () => part('App Header', { entry: 'IC-13' })
        b.input(pointerInput('move', 400, 20))
        await b.flush(ms)
        b.input(pointerInput('move', 401, 20))
        await b.flush(ms)
        b.partAt = () => null
        b.input(pointerInput('move', 600, 400))
        await b.flush(ms)
      },
    })
    out.push({
      id: `clock.hover-bar.${ms}`, options: { doc: 'rich' }, run: async (b) => {
        const p = pointOf(b, 3) ?? chartCenter(b)
        b.partAt = () => null
        b.input(pointerInput('move', p.x, p.y))
        await b.flush(ms)
        b.input(pointerInput('move', p.x + 1, p.y))
        await b.flush(ms)
      },
    })
    out.push({
      id: `clock.hold-entry.${ms}`, options: { doc: 'two' }, run: async (b) => {
        for (const id of ['IC-13', 'IC-15', 'IC-105']) {
          b.partAt = () => part('App Header', { entry: id })
          b.input(pointerInput('move', 400, 20))
          b.input(pointerInput('down', 400, 20))
          await b.flush(ms)
          b.call('pressContinued', () => b.loop.pressContinued())
          await b.flush(ms)
          b.input(pointerInput('up', 400, 20))
          await b.flush()
        }
      },
    })
    out.push({
      id: `clock.notice-hover.${ms}`, options: { doc: 'two' }, run: async (b) => {
        b.call('raise', () => b.loop.raiseStartupNotice('RS-25', 2))
        await b.flush()
        b.partAt = () => part('Notification Area', { noticeBoxReasons: ['RS-25'] })
        b.input(pointerInput('move', 500, 650))
        await b.flush(ms)
        b.partAt = () => null
        b.input(pointerInput('move', 100, 300))
        await b.flush(ms)
      },
    })
  }
  out.push({
    id: 'clock.day-rolls', options: { doc: 'two' }, run: async (b) => {
      await b.key('D', mods('cs'))
      await b.flush(24 * 3600 * 1000)
      await b.key('D', mods('cs'))
      await b.key('D', mods('cs'))
    },
  })
}

function escapeCases(out: Scenario[]): void {
  const builds: [string, (b: Bench) => Promise<void>][] = [
    ['help-panel-palette', async (b) => {
      await selectTask(b, 2)
      await b.entry('IC-17', 'App Header')
      await b.entry('IC-22', 'App Header')
    }],
    ['search-report', async (b) => {
      await b.entry('IC-117', 'App Header')
      await b.entry('IC-107', 'App Header')
      await selectTask(b, 3)
    }],
    ['notice-and-selection', async (b) => {
      await selectTask(b, 2)
      b.call('raise', () => b.loop.raiseStartupNotice('RS-63'))
      await b.flush()
    }],
    ['armed', async (b) => {
      await b.entry('IC-35', 'Command Palette')
      b.input(pointerInput('move', 500, 400))
      await b.flush()
    }],
    ['dual-cursor', async (b) => {
      await b.entry('IC-45', 'Command Palette')
      await b.click(500, 400)
      b.input(pointerInput('move', 560, 400))
      await b.flush()
    }],
    ['tooltip', async (b) => {
      b.partAt = () => part('App Header', { entry: 'IC-10' })
      b.input(pointerInput('move', 300, 20))
      await b.flush(3000)
    }],
    ['filter-menu', async (b) => {
      await b.key('F', mods('c'))
      const column = columnsOf(b.lastView)[0] ?? 'name'
      await b.click(600, 300, part('Search Panel', { entry: 'IC-122', searchFilterColumn: column }))
    }],
    ['confirmation', async (b) => {
      await b.entry('IC-106', 'Task Group Panel')
    }],
  ]
  for (const [id, build] of builds) {
    for (const [tail, keys] of [['esc', ['Esc', 'Esc', 'Esc', 'Esc', 'Esc', 'Esc']], ['enter', ['Enter', 'Enter']], ['mixed', ['Esc', 'Enter', 'Esc', 'Tab', 'Esc']]] as const) {
      out.push({
        id: `escape.${id}.${tail}`, options: { doc: 'rich' }, run: async (b) => {
          await build(b)
          for (const key of keys) {
            b.call('isBrowserDefaultStopped.' + key, () => b.loop.isBrowserDefaultStopped(keyInput(key)))
            await b.key(key)
          }
        },
      })
    }
  }
}

function hostVariantCases(out: Scenario[]): void {
  const keys = ['P', 'F', 'N', 'Enter', 'Esc', 'F2']
  for (const [variant, options] of [
    ['no-screen', { screen: false }], ['no-optional', { optionalSeams: false }], ['ja', { language: 'ja' }], ['dark', { theme: 'dark' }], ['wide', { env: WIDE }],
  ] as const) {
    for (const key of keys) {
      out.push({
        id: `variant.${variant}.key.${key}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
          await selectTask(b, 2)
          await b.key(key)
          await b.key(key, mods('c'))
        },
      })
    }
    for (const id of ['IC-1', 'IC-2', 'IC-17', 'IC-22', 'IC-107', 'IC-117', 'IC-62', 'IC-132']) {
      out.push({
        id: `variant.${variant}.entry.${id}`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
          await b.entry(id, id === 'IC-62' || id === 'IC-132' ? 'Command Palette' : 'App Header')
          await b.key('Esc')
        },
      })
    }
    out.push({
      id: `variant.${variant}.drag`, options: { doc: 'rich', ...(options as BenchOptions) }, run: async (b) => {
        const p = pointOf(b, 3)
        if (p !== null) await b.drag(p, { x: p.x + 20, y: p.y })
      },
    })
  }
}

function extraCases(out: Scenario[]): void {
  // Pictures laid on a fixed fit span: export, copy, agent exports.
  for (let io = 1; io <= 9; io += 1) {
    out.push({
      id: `span.export.IO-${io}`, options: { doc: "span" }, run: async (b) => {
        await b.entry("IC-2", "App Header")
        await b.click(500, 300, part("Export Chooser", { format: `IO-${io}` }))
        await b.flush(10)
      },
    })
  }
  for (const env of [SCREEN, WIDE]) {
    out.push({
      id: `span.copy-picture.${env.width}`, options: { doc: "span", env }, run: async (b) => {
        await b.entry("IC-3", "App Header")
        await b.flush(10)
        b.call("exportScene", () => b.loop.exportScene())
      },
    })
  }
  out.push({
    id: "span.agent-exports", options: { doc: "span" }, run: async (b, deps) => {
      const api = b.call("installAgentApi", () => deps.installAgentApi({ ...b.loop.agentApiSeams(), writerName: "agent", schemaVersion: AGENT_SCHEMA })) as Any
      b.call("agent.exportSvg", () => api.exportSvg())
      await b.callAsync("agent.exportPng", async () => api.exportPng())
      await b.callAsync("agent.exportEmbeddedHtml", async () => api.exportEmbeddedHtml())
      call2(b, () => api.showOnlyTasks([2, 3]))
      await b.flush()
      b.call("exportScene.filtered", () => b.loop.exportScene())
    },
  })
  // Settings-panel actions: GRS reset, time shift, whole-schedule shift, base time zone.
  for (const answer of ["Y", "N"]) {
    out.push({
      id: `settings.reset.${answer}`, options: { doc: "rich" }, run: async (b) => {
        await b.entry("IC-17", "App Header")
        await b.entry("IC-139", "Properties Panel")
        await b.key(answer)
        await b.entry("IC-139", "Properties Panel")
      },
    })
    for (const holder of ["timeShift", "wholeScheduleShift", "baseTimeZoneDraft"]) {
      out.push({
        id: `settings.${holder}.${answer}`, options: { doc: "rich" }, run: async (b) => {
          await b.entry("IC-17", "App Header")
          const controls = fieldControls(b.lastView).filter((c) => c.key?.holder === holder)
          b.record("controls", controls.map((c) => [c.row, c.key, c.kind, c.choices.slice(0, 3)]))
          for (const control of controls) {
            const text = control.press ?? (control.kind === "date" ? "2026-05-01" : control.kind === "number" ? "120" : control.choices[1] ?? control.choices[0] ?? "60")
            await commitField(b, control, text)
            await b.key(answer)
          }
          await b.entry("IC-162", "Properties Panel")
          await b.key(answer)
          await b.key("Esc")
        },
      })
    }
  }
  // Scrollbars and panel dividers, found on the drawn view.
  for (const doc of ["rich", "trimmed"]) {
    for (const withPanel of [false, true]) {
      for (const [dxy, steps] of [[40, 3], [-40, 3], [600, 2], [-600, 2]] as const) {
        out.push({
          id: `frame-parts.${doc}.${withPanel ? "panel" : "bare"}.${dxy}`, options: { doc }, run: async (b) => {
            if (withPanel) {
              const p = b.barPoints()[0]
              if (p !== undefined) await b.click(p.x, p.y, null, { clickCount: 2 })
            }
            for (const bar of (b.lastView?.frame?.scrollbars ?? []) as Any[]) {
              const from = { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
              const to = bar.axis === "horizontal" ? { x: from.x + dxy, y: from.y } : { x: from.x, y: from.y + dxy }
              await b.drag(from, to, { on: part("Scrollbars", { scrollbarAxis: bar.axis }), steps })
              await b.click(bar.track.x + 2, bar.track.y + 2, part("Scrollbars", { scrollbarAxis: bar.axis }))
            }
            for (const divider of (b.lastView?.frame?.dividers ?? []) as Any[]) {
              const from = { x: divider.band.x + divider.band.width / 2, y: divider.band.y + divider.band.height / 2 }
              await b.drag(from, { x: from.x + dxy, y: from.y }, { on: part("Panel Divider", { dividerPanel: divider.panel }), steps })
            }
          },
        })
      }
    }
  }
  // A wheel over an open table window, and keys typed into its word.
  for (const [open, surface] of [["IC-117", "Search Panel"], ["IC-107", "Delay Diagnostics Report"], ["IC-22", "Help Modal"]] as const) {
    for (const notches of [-2, 2]) {
      out.push({
        id: `table-wheel.${open}.${notches}`, options: { doc: "trimmed" }, run: async (b) => {
          await b.entry(open, "App Header")
          await b.wheel(600, 300, notches, { x: 0, y: notches * 100 }, mods(""), part(surface))
          await b.wheel(600, 300, notches, { x: 0, y: notches * 100 }, mods("c"), part(surface))
        },
      })
    }
  }
  // The parent-task link armed, then picks on Tasks (AR-7).
  for (const [first, second] of [[2, 3], [3, 4], [4, 2], [1, 1]] as const) {
    out.push({
      id: `parent-link.${first}.${second}`, options: { doc: "rich" }, run: async (b) => {
        await b.entry("IC-141", "Command Palette")
        await b.entry("IC-142", "Command Palette")
        await selectTask(b, first)
        await selectTask(b, second)
        await b.key("Enter")
        await b.key("ArrowDown")
        await b.key("Enter")
        await b.key("Esc")
      },
    })
  }
  // Language and theme switches through their entries, then a frame.
  for (const id of ["IC-21", "IC-16", "IC-100", "IC-99", "IC-101", "IC-103", "IC-128"]) {
    out.push({
      id: `look.${id}`, options: { doc: "rich", language: "ja" }, run: async (b) => {
        for (let i = 0; i < 3; i += 1) await b.entry(id, id === "IC-128" ? "Help Modal" : "App Header")
        b.call("themePreference", () => b.loop.themePreference())
      },
    })
  }
}

function call2(b: Bench, run: () => unknown): void {
  b.call("agent.call", run)
}

export function scenarios(found: Found): Scenario[] {
  const out: Scenario[] = []
  startCases(out)
  keyCases(out)
  entryCases(out)
  dragCases(out, found)
  rowCases(out, found)
  boxCases(out, found)
  edgeScrollCases(out)
  wheelCases(out)
  fieldCases(out)
  fileCases(out)
  noticeCases(out)
  windowCases(out)
  fullScreenCases(out)
  agentCases(out)
  historyCases(out)
  clockCases(out)
  escapeCases(out)
  hostVariantCases(out)
  extraCases(out)
  return out
}

// ---------------------------------------------------------------------------
// The exported helpers and constants, called directly
// ---------------------------------------------------------------------------

function helperCases(deps: Deps, lines: CaseLines): void {
  const e = deps.entry
  const s = deps.session
  const put = (id: string, run: () => unknown): void => lines.putValue(`helper.${id}`, guarded(run))
  for (const name of Object.keys(e).sort()) {
    if (typeof e[name] !== 'function') lines.putValue(`const.${name}`, e[name])
  }
  const sessions: [string, Any][] = [['empty', s.emptyScreenSession]]
  const events: Any[] = [
    { type: 'rememberedEnablingLoaded', isRememberedEnabled: true },
    { type: 'fullScreenChanged', isFullScreen: true },
    { type: 'displayScaleStepped', percent: 120, end: null },
  ]
  let state = s.emptyScreenSession
  events.forEach((event, at) => {
    const step = guarded(() => s.advanceScreenSession(state, event))
    if ('state' in (step as Any)) state = (step as Any).state
    sessions.push([`after${at}`, state])
  })
  for (const [id, session] of sessions) {
    for (const fn of ['openSurfaceNameIn', 'dualCursorFollowingIn', 'panelShowingIn', 'standingNoticesIn', 'selectedObjectsIn', 'isQuestionAskedIn']) {
      put(`${fn}.${id}`, () => e[fn](session))
    }
  }
  const envs = [SCREEN, WIDE, UNSETTLED, { ...SCREEN, width: 1 }, { ...SCREEN, height: 0 }, { ...SCREEN, appHeaderHeight: 0 }, { ...WIDE, commandPaletteBandPx: { width: 0, height: 0 } }, { ...SCREEN, taskGroupControlsHeightPx: 24 }, { ...SCREEN, scrollbarThickness: 9 }, { ...WIDE, commandPaletteBandPx: { width: 120, height: 401 } }]
  envs.forEach((one, i) => {
    put(`isSizeSettled.${i}`, () => e.isSizeSettled(one))
    envs.forEach((other, j) => put(`isSameEnvironment.${i}.${j}`, () => e.isSameEnvironment(one, other)))
  })
  const regions = [
    { appHeader: { x: 0, y: 0, width: 10, height: 10 }, scheduleCanvas: { x: 0, y: 10, width: 10, height: 10 }, taskGroupPanel: { x: 0, y: 0, width: 1, height: 1 }, timeRuler: { x: 0, y: 0, width: 1, height: 1 }, propertiesPanel: { x: 0, y: 0, width: 0, height: 0 }, taskGroupArea: { x: 1, y: 1, width: 5, height: 5 } },
  ]
  const shifted = { ...regions[0], taskGroupArea: { x: 1, y: 1, width: 5, height: 6 } }
  put('isSameScreenRegions.same', () => e.isSameScreenRegions(regions[0], { ...regions[0] }))
  put('isSameScreenRegions.shifted', () => e.isSameScreenRegions(regions[0], shifted))
  const records: [unknown, unknown][] = [[{ a: 1 }, { a: 1 }], [{ a: 1 }, { a: 2 }], [{ a: 1 }, { a: 1, b: 2 }], [{}, {}], [{ a: [1] }, { a: [1] }]]
  records.forEach(([a, b], i) => put(`isSameRecord.${i}`, () => e.isSameRecord(a, b)))
  const refusalSets: Any[] = [[], [{ reason: 'RS-1' }], [{ reason: 'tooLate' }], [{ row: 'WS-2' }], [{ code: 'x' }, { code: 'y' }], [{ kind: 'gestureInFlight' }]]
  refusalSets.forEach((set, i) => put(`noticeReasonOfRefusals.${i}`, () => e.noticeReasonOfRefusals(set)))
  const docs = [twoGroupDocument(), richDocument()]
  const allOff = twoGroupDocument()
  allOff.schedule.calendars = allOff.schedule.calendars.map((c: Any) => ({ ...c, weekDays: (c.weekDays ?? []).map((w: Any) => ({ ...w, dayWorking: false })) }))
  docs.push(allOff)
  docs.forEach((doc, i) => {
    put(`noWorkingWeekdayReason.${i}`, () => e.noWorkingWeekdayReason(doc))
    put(`discardQuestionOf.${i}`, () => e.discardQuestionOf(doc))
    put(`startedDocumentOf.${i}`, () => e.startedDocumentOf(doc, '2026-10-24T09:00:00Z', 'UTC+09:00'))
  })
  const corners = [{ x: 0, y: 0 }, { x: -50, y: -50 }, { x: 5000, y: 5000 }, { x: 990, y: 690 }, { x: 500.5, y: 300.25 }]
  const bands = [{ width: 100, height: 400 }, { width: 0, height: 0 }, { width: 2000, height: 2000 }]
  const windows = [{ width: 1000, height: 700 }, { width: 50, height: 50 }]
  corners.forEach((c, i) => bands.forEach((band, j) => windows.forEach((w, k) => put(`paletteCornerInWindow.${i}.${j}.${k}`, () => e.paletteCornerInWindow(c, band, w)))))
  put('readToday', () => e.readToday())
  put('readSystemStandardTimeZone', () => e.readSystemStandardTimeZone())
  put('readInstantOfWrite', () => e.readInstantOfWrite())
  put('readLocalMoment', () => e.readLocalMoment())
  put('readMonotonicMs.type', () => typeof e.readMonotonicMs())
  put('startupDisplayLanguage', () => e.startupDisplayLanguage())
  put('startupThemePreference', () => e.startupThemePreference())
  put('isStartupAgentApiEnabled', () => e.isStartupAgentApiEnabled())
  for (let row = 1; row <= 20; row += 1) {
    for (const facing of ['start', 'finish', 'up', 'down']) {
      for (const ink of ['hollow', 'filled']) put(`pointerImageOf.PK-${row}.${facing}.${ink}`, () => e.pointerImageOf(`PK-${row}`, facing, ink))
    }
  }
  put('pointerRowOf.null', () => e.pointerRowOf(null, false))
  put('pointerRowOf.armed', () => e.pointerRowOf({ grab: 'GA-9', item: { kind: 'task', uid: 1 } }, true))
  const groupsSets: string[][] = [[], ['a'], ['a', 'b']]
  const selections: Any[] = [
    { taskUids: [], dependencies: [], commentBoxIds: [], highlightBoxIds: [] },
    { taskUids: [1, 2], dependencies: [], commentBoxIds: [], highlightBoxIds: [] },
  ]
  groupsSets.forEach((groups, i) => {
    put(`isPasteRefusedFor.${i}`, () => e.isPasteRefusedFor(groups))
    selections.forEach((selection, j) => put(`copiedForPasteOf.${i}.${j}`, () => e.copiedForPasteOf(groups, selection)))
  })
  void canon
}

export async function runScenarios(args: Deps & { readonly lines: CaseLines; readonly only: string | null; readonly accept?: (id: string) => boolean; readonly onScenario?: (id: string) => void }): Promise<void> {
  const { entry, lines, only } = args
  lines.putValue('exports', Object.keys(entry).sort())
  vi.useFakeTimers({ now: CLOCK_START, toFake: ['Date', 'performance'] })
  helperCases(args, lines)
  vi.useRealTimers()
  const started = Date.now()
  const timing = process.env['COMPARATOR_TIMING'] === '1'
  const marked = new Map<string, string[]>()
  const found: Record<string, { bars: Any[]; rows: Any[]; boxes: Any[] }> = {}
  for (const doc of ["two", "rich"]) {
    const probe = new Bench({ doc })
    probe.frameLoopFn = entry.frameLoop
    try {
      probe.build()
      await probe.flush()
      found[doc] = { bars: probe.barPoints(), rows: probe.rowPoints(), boxes: probe.boxPoints() }
    } finally {
      probe.uninstall()
    }
  }
  lines.putValue("found", found)
  for (const scenario of scenarios(found)) {
    if (only !== null && !scenario.id.includes(only)) continue
    if (args.accept !== undefined && !args.accept(scenario.id)) continue
    args.onScenario?.(scenario.id)
    const bench = new Bench(scenario.options)
    bench.frameLoopFn = entry.frameLoop
    const traced = process.env['COMPARATOR_TRACE'] !== undefined && scenario.id === process.env['COMPARATOR_TRACE']
    if (traced) bench.log.trace = []
    const t0 = performance.now()
    let digest = ''
    try {
      bench.build()
      await bench.flush()
      await scenario.run(bench, args)
    } catch (error) {
      bench.record('scenario.threw', errorRecord(error))
    } finally {
      digest = bench.finish()
      bench.uninstall()
    }
    lines.put(scenario.id, digest)
    for (const mark of bench.marks.keys()) marked.set(mark, [...(marked.get(mark) ?? []), scenario.id])
    if (traced) writeFileSync((process.env['COMPARATOR_OUT'] ?? '') + '.trace', (bench.log.trace ?? []).join('\n') + '\n')
    if (timing) console.log(`${scenario.id} ${(performance.now() - t0).toFixed(0)}ms entries=${bench.log.count}`)
  }
  console.log(`frame-loop scenarios took ${Date.now() - started}ms`)
  if (process.env["COMPARATOR_MARKS"] === "1") {
    for (const [mark, ids] of [...marked].sort()) console.log(`MARK ${mark} ${ids.length}: ${ids.slice(0, 12).join(" ")}`)
  }
}

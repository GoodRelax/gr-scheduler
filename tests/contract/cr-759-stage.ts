// CR-759 spec-only bench: the fix proposals opened through the CR-731 window stage, a browser-like press on a check box, the footer band read back

import type { Document } from '../../src/entity/document-model/document/document'
import { selfAndDescendants, styleMap, type FakeElement, type FakeEvent } from '../fixtures/fake-browser'
import { FOOTER_ROLE, PROPOSALS_ROLE, isInert } from './cr-731-shell'
import { FINISH_OF, START_OF, WORDS, documentOf, iconWord, oneRow, proposed, type TaskSpec } from './cr-731-stage'
import { smallestWithText, windowStage, type WindowStage } from './cr-731-window-stage'

export { FOOTER_ROLE, PROPOSALS_ROLE, isInert }

// WHY: the seam the code seat builds for RW-17 -- the notice is its own child of the footer band, under the entries.
export const NOTICE_ROLE = 'Delay Fix Notice'

export type Language = 'ja' | 'en'
export const LANGUAGES: readonly Language[] = ['ja', 'en']

function sectionWord(section: string, field: 'part' | 'rowId', key: string, language: Language): string {
  const found = (WORDS[section] as readonly Record<string, any>[]).find((one) => one[field] === key)
  const text = found?.['text']?.[language]
  if (typeof text !== 'string') throw new Error(`the dictionary has no ${section}/${key} in ${language}`)
  return text
}

export const fixWord = (part: string, language: Language = 'ja'): string => sectionWord('delayFixes', 'part', part, language)
export const columnWord = (row: string, language: Language = 'ja'): string => sectionWord('delayFixColumns', 'rowId', row, language)

export function entryLabel(icon: string, language: Language = 'ja'): string {
  const label = iconWord(icon, 'label', language)
  if (label === undefined) throw new Error(`the dictionary has no label for ${icon} in ${language}`)
  return label
}

export const filled = (text: string, values: Readonly<Record<string, number | string>>): string =>
  Object.entries(values).reduce((made, [key, value]) => made.replace(`{${key}}`, String(value)), text)

export const countText = (n: number, language: Language = 'ja'): string => filled(fixWord('fixCount', language), { n })

// WHY: IC-21 chooses the screen language (FR-038); the stage starts in Japanese.
export async function proposalsOpened(document: Document, language: Language = 'ja'): Promise<WindowStage> {
  const stage = await windowStage(document)
  if (language === 'en') await stage.press('IC-21')
  await stage.press('IC-107')
  await stage.press('IC-155')
  return stage
}

export const entryIn = (stage: WindowStage, icon: string): FakeElement | null =>
  selfAndDescendants(stage.window() ?? stage.built.root()).find((one) => one.getAttribute('data-icon') === icon) ?? null

export function needEntry(stage: WindowStage, icon: string): FakeElement {
  const found = entryIn(stage, icon)
  if (found === null) throw new Error(`the window draws no entrance data-icon="${icon}"`)
  return found
}

export const wordsOf = (entry: FakeElement): string =>
  [entry.textContent, entry.getAttribute('aria-label') ?? '', entry.getAttribute('title') ?? ''].join('\n')

export const footerOf = (stage: WindowStage): FakeElement => stage.need(FOOTER_ROLE)

export const footerEntry = (stage: WindowStage, icon: string): FakeElement | null =>
  selfAndDescendants(footerOf(stage)).find((one) => one.getAttribute('data-icon') === icon) ?? null

export function countElement(stage: WindowStage, n: number, language: Language = 'ja'): FakeElement | null {
  return smallestWithText(footerOf(stage), countText(n, language))
}

export const noticeOf = (stage: WindowStage): FakeElement | null =>
  selfAndDescendants(footerOf(stage)).find((one) => one.getAttribute('data-role') === NOTICE_ROLE) ?? null

const partsOf = (stage: WindowStage, part: string): FakeElement[] =>
  selfAndDescendants(stage.need(PROPOSALS_ROLE)).filter((one) => one.getAttribute('data-delay-fix-part') === part)

export const boxOf = (stage: WindowStage, key: string): FakeElement | null =>
  partsOf(stage, 'check').find((one) => one.getAttribute('data-delay-fix-key') === key) ?? null

export function needBox(stage: WindowStage, key: string): FakeElement {
  const found = boxOf(stage, key)
  if (found === null) throw new Error(`the proposals draw no check box for the row ${key}`)
  return found
}

export const choiceListOf = (stage: WindowStage, key: string): FakeElement | null =>
  partsOf(stage, 'choice').find((one) => one.getAttribute('data-delay-fix-key') === key) ?? null

export const isTicked = (box: FakeElement): boolean => (box as unknown as { checked?: unknown }).checked === true

export const activeElement = (stage: WindowStage): FakeElement | null => stage.built.world.activeElement

export function tableRowOf(stage: WindowStage, key: string): FakeElement {
  const carrier = selfAndDescendants(stage.need(PROPOSALS_ROLE)).find((one) => one.getAttribute('data-delay-fix-key') === key)
  for (let at: FakeElement | null = carrier ?? null; at !== null; at = at.parentNode) if (at.tagName === 'TR') return at
  throw new Error(`the proposals draw no row for ${key}`)
}

export function cellUnder(stage: WindowStage, key: string, column: string, language: Language = 'ja'): FakeElement {
  const headings = selfAndDescendants(stage.need(PROPOSALS_ROLE)).filter((one) => one.tagName === 'TH')
  const at = headings.findIndex((one) => one.textContent.trim() === columnWord(column, language))
  if (at < 0) throw new Error(`no heading reads ${columnWord(column, language)}`)
  const cell = tableRowOf(stage, key).children.filter((one) => one.tagName === 'TD')[at]
  if (cell === undefined) throw new Error(`the row ${key} has no cell under ${column}`)
  return cell
}

function raise(stage: WindowStage, node: FakeElement, type: string): void {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
  } as unknown as FakeEvent
  for (let at: FakeElement | null = node; at !== null; at = at.parentNode) {
    for (const one of [...stage.built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
  }
}

// WHY: a browser flips a clicked box itself, then fires input and change; the stand-in DOM flips nothing, so a press
// is the flip, both events up the tree and the pointer -- a refused tick left on screen is then seen, as in a browser.
export async function pressBox(stage: WindowStage, box: FakeElement): Promise<void> {
  const held = box as unknown as { checked?: boolean }
  held.checked = held.checked !== true
  raise(stage, box, 'input')
  raise(stage, box, 'change')
  await stage.clickOn(box)
}

export const styleOf = (element: FakeElement, property: string): string => (styleMap(element).get(property) ?? '').trim().toLowerCase()

export const isFlex = (element: FakeElement): boolean => ['flex', 'inline-flex'].includes(styleOf(element, 'display'))

export function documentOrder(root: FakeElement, element: FakeElement): number {
  return selfAndDescendants(root).indexOf(element)
}

export function commonAncestor(elements: readonly FakeElement[]): FakeElement | null {
  const first = elements[0]
  if (first === undefined) return null
  for (let at: FakeElement | null = first; at !== null; at = at.parentNode) {
    if (elements.every((one) => at!.contains(one))) return at
  }
  return null
}

export function keyOf(document: Document, findingRow: string, taskUid: number): string {
  const key = oneRow(proposed(document), findingRow, taskUid)['key']
  if (typeof key !== 'string') throw new Error(`the ${findingRow} row of task ${String(taskUid)} carries no key (T-064 DelayFixCheck)`)
  return key
}

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

export const STATUS_DATE = '2027-05-01T00:00:00'

export const EVERY_KIND = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-21'),
      span(2, '05-10', '05-14', { parent: 1 }),
      span(3, '05-17', '05-26', { parent: 1 }),
      span(4, '04-12', '04-16', { actualStart: START_OF('2027-05-03'), percentComplete: 10 }),
      span(5, '04-05', '04-09'),
      span(10, '05-10', '05-21', { readOnly: true }),
      span(11, '05-10', '05-14', { parent: 10 }),
      span(12, '05-17', '05-26', { parent: 10 }),
    ],
    { statusDate: STATUS_DATE },
  )

export const TWO_ONE_CHOICE_ROWS = (): Document =>
  documentOf(
    [
      span(4, '05-10', '05-14', { actualStart: START_OF('2027-05-03'), percentComplete: 10 }),
      span(6, '05-10', '05-14', { actualStart: START_OF('2027-05-04'), percentComplete: 10 }),
    ],
    { statusDate: STATUS_DATE },
  )

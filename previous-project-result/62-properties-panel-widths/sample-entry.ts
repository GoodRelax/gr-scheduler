// Sample 62 -- the Properties Panel drawn by the shipped drawing code, one panel per content kind.
// Built into index.html by build-sample.mjs; it measures the least width at which a panel shows no
// horizontal scrollbar and no field name takes more than two lines (DFC-2962, JDG-2466).

import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type { PropertiesPanel, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith, type ItemRef } from '../../src/entity/document-model/selection/selection'
import { STYLE, pageGroundStyle, themeStyle } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  fillPropertiesPanel,
  fitPanelFields,
  propertiesPanelStyle,
} from '../../src/framework/dom-screen-surface/properties-panel-drawing'
// @ts-expect-error -- a module build-sample.mjs makes from the startup sample (its first tasks)
import template from 'sample-document'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

type Language = 'ja' | 'en'

interface Face {
  readonly key: string
  readonly title: string
  readonly item: ItemRef | null
  readonly taskGroupIds: readonly string[]
  readonly isSettings: boolean
}

const PANEL_HEIGHT_PX = 760
const SWEEP_FROM_PX = 160
const SWEEP_TO_PX = 900
const SWEEP_STEP_PX = 10
const MOST_NAME_LINES = 2

const doc = structuredClone(template) as unknown as { schedule: Schedule; documentSettings: DocumentSettings }
const schedule = doc.schedule as unknown as Record<string, unknown> & Schedule
const firstGroup = schedule.taskGroups[0]?.id ?? ''
const milestone = schedule.tasks.find((one) => one.milestone)
const withLink = schedule.tasks.find((one) => one.dependencies.length > 0)

;(schedule as unknown as { commentBoxes: unknown[] }).commentBoxes = [{
  id: 'cb-1', leaderShapeKind: null, text: 'Review the design with the whole team before the gate.',
  anchorDate: '2026-04-08', anchorTaskGroupId: firstGroup, bodyOffsetPx: null, anchorBandFraction: null,
  anchorTaskUid: null, anchorTaskFigure: null, anchorHighlightBoxId: null, anchorSnapPoint: null,
  strokeColor: null, strokeWidthPx: null, fillColor: null, fillTransparencyPercent: null, textColor: null,
}]
;(schedule as unknown as { highlightBoxes: unknown[] }).highlightBoxes = [{
  id: 'hb-1', start: '2026-04-02T08:00:00', finish: '2026-04-20T17:00:00', topTaskGroupId: firstGroup,
  bottomTaskGroupId: firstGroup, strokeColor: null, cornerRadiusPx: null, strokeWidthPx: null, fillColor: null,
  fillTransparencyPercent: null,
}]

// WHY: each time zone field holds the longest choice it offers (ZN-54, ZN-51), the worst case for the width.
;(doc.documentSettings as unknown as { displayTimeZones: string[] }).displayTimeZones = [
  'UTC+03:00 DST', 'UTC+02:00 DST', 'UTC+03:00 DST', 'UTC+02:00 DST',
]
;(schedule.project as unknown as { scheduleDataTimeZone: string }).scheduleDataTimeZone = 'UTC+02:00'

const FACES: readonly Face[] = [
  { key: 'settings', title: 'Document Settings', item: null, taskGroupIds: [], isSettings: true },
  { key: 'task', title: 'Task', item: { kind: 'task', uid: 1 }, taskGroupIds: [], isSettings: false },
  { key: 'milestone', title: 'Milestone', item: { kind: 'task', uid: milestone?.uid ?? 1 }, taskGroupIds: [], isSettings: false },
  { key: 'taskGroup', title: 'Task Group', item: null, taskGroupIds: [firstGroup], isSettings: false },
  { key: 'commentBox', title: 'Comment Box', item: { kind: 'commentBox', id: 'cb-1' }, taskGroupIds: [], isSettings: false },
  { key: 'highlightBox', title: 'Highlight Box', item: { kind: 'highlightBox', id: 'hb-1' }, taskGroupIds: [], isSettings: false },
  {
    key: 'dependency',
    title: 'Dependency',
    item: { kind: 'dependency', successorUid: withLink?.uid ?? 1, ordinal: 0 },
    taskGroupIds: [],
    isSettings: false,
  },
]

function readingsOf(taskGroupIds: readonly string[]): ScreenViewReadings {
  return {
    openedFileName: null, fileSavedAt: null, fileSavedByteLength: null, isAgentApiEnabled: false, pointer: null,
    pointerRestedMs: 0, hintTargetDwellMs: 0, commandPaletteAt: { x: 0, y: 0 }, iconUnderPointer: null,
    themePreference: 'light', themeHue: schedule.project.themeHue ?? 0, selectedTaskGroupIds: [...taskGroupIds],
    selectedResourceUids: [], notices: [], confirmation: null, taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
}

function sessionOf(face: Face, language: Language): ScreenSession {
  const selection = face.item === null ? emptySelection() : selectionWith(emptySelection(), face.item)
  const content = face.isSettings
    ? { kind: 'documentSettingsDisplayed' }
    : { kind: 'selectionDisplayed', subject: { selection, taskGroupIds: [...face.taskGroupIds] } }
  return {
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language, propertiesPanelContentState: content },
  } as unknown as ScreenSession
}

function describedPanel(face: Face, language: Language): PropertiesPanel | null {
  const selection = face.item === null ? emptySelection() : selectionWith(emptySelection(), face.item)
  return propertiesPanelFromSelection(schedule, doc.documentSettings, selection, sessionOf(face, language), readingsOf(face.taskGroupIds))
}

function nameLinesOf(panel: HTMLElement): number {
  const names = Array.from(panel.querySelectorAll<HTMLElement>('div[data-field-row] > span:first-child'))
  return names.reduce((most, one) => {
    const lineHeight = parseFloat(getComputedStyle(one).lineHeight)
    return Number.isFinite(lineHeight) && lineHeight > 0 ? Math.max(most, Math.round(one.offsetHeight / lineHeight)) : most
  }, 0)
}

// WHY: a time zone choice keeps its two lines when the place does not wrap (JDG-2541 lets it wrap in English).
function choiceLinesOf(panel: HTMLElement): number {
  const shown = Array.from(panel.querySelectorAll<HTMLElement>('[data-two-line-choice] > button > span:first-child'))
  return shown.reduce((most, one) => {
    const lineHeight = parseFloat(getComputedStyle(one).lineHeight)
    return lineHeight > 0 ? Math.max(most, Math.round(one.offsetHeight / lineHeight)) : most
  }, 0)
}

let isChoiceKept = true

function isFitting(panel: HTMLElement, width: number): boolean {
  panel.style.width = `${width}px`
  fitPanelFields(panel)
  const isChoiceFitting = !isChoiceKept || choiceLinesOf(panel) <= MOST_NAME_LINES
  return panel.scrollWidth <= panel.clientWidth && nameLinesOf(panel) <= MOST_NAME_LINES && isChoiceFitting
}

// WHY: the least width from which every wider width also fits, so a lucky narrow fit is not taken.
function leastWidthOf(panel: HTMLElement): number | null {
  let least: number | null = null
  for (let width = SWEEP_TO_PX; width >= SWEEP_FROM_PX; width -= SWEEP_STEP_PX) {
    if (!isFitting(panel, width)) break
    least = width
  }
  return least
}

interface Drawn {
  readonly face: Face
  readonly panel: HTMLElement
  readonly slider: HTMLInputElement
  readonly readout: HTMLElement
}

function drawFace(face: Face, language: Language, row: HTMLElement): Drawn | null {
  const description = describedPanel(face, language)
  const column = document.createElement('section')
  column.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:0 0 auto;'
  const heading = document.createElement('h2')
  heading.textContent = face.title
  heading.style.cssText = 'font-size:16px;margin:0;'
  const readout = document.createElement('div')
  readout.style.cssText = 'font-size:13px;'
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(SWEEP_FROM_PX)
  slider.max = String(SWEEP_TO_PX)
  slider.step = String(SWEEP_STEP_PX)
  column.append(heading, slider, readout)
  row.append(column)
  if (description === null) {
    readout.textContent = 'no panel for this content'
    return null
  }
  const panel = document.createElement('div')
  panel.style.cssText =
    STYLE.propertiesPanel + propertiesPanelStyle() + `position:relative;overflow-y:scroll;height:${PANEL_HEIGHT_PX}px;`
  panel.setAttribute('data-face', face.key)
  column.append(panel)
  fillPropertiesPanel(document, panel, description, new Map(), new Map())
  return { face, panel, slider, readout }
}

// WHY: names what stops a narrower panel -- the field reaching past the right edge, or a name on 3+ lines.
function limiterAt(panel: HTMLElement, width: number): string {
  if (width < SWEEP_FROM_PX) return ''
  isFitting(panel, width)
  const edge = panel.getBoundingClientRect().left + panel.clientLeft + panel.clientWidth + 0.5
  const past = Array.from(panel.querySelectorAll<HTMLElement>('*')).filter((one) => one.getBoundingClientRect().right > edge)
  const leaf = past.filter((one) => !past.some((other) => other !== one && one.contains(other)))
  const named = leaf.map((one) => {
    const line = one.closest('[data-field-row]') ?? one
    const row = line.getAttribute('data-field-row') ?? one.tagName.toLowerCase()
    return `${row}:${(one.textContent ?? '').trim().slice(0, 24)}`
  })
  const tall = Array.from(panel.querySelectorAll<HTMLElement>('div[data-field-row] > span:first-child')).filter((one) => {
    const lineHeight = parseFloat(getComputedStyle(one).lineHeight)
    return lineHeight > 0 && Math.round(one.offsetHeight / lineHeight) > MOST_NAME_LINES
  })
  return [...new Set([...named, ...tall.map((one) => `3+ lines:${(one.textContent ?? '').slice(0, 24)}`)])].slice(0, 4).join(' | ')
}

function measureAll(drawn: readonly Drawn[], language: Language): Record<string, number | null> {
  const found: Record<string, number | null> = {}
  const limiters: Record<string, string> = {}
  for (const one of drawn) {
    const least = leastWidthOf(one.panel)
    found[one.face.key] = least
    limiters[one.face.key] = limiterAt(one.panel, (least ?? SWEEP_TO_PX) - SWEEP_STEP_PX)
    const width = least ?? SWEEP_TO_PX
    one.slider.value = String(width)
    isFitting(one.panel, width)
    one.readout.textContent = `${language}: least ${least ?? 'none'} px / now ${width} px`
  }
  ;(window as unknown as { limiters: Record<string, string> }).limiters = limiters
  return found
}

function wireSlider(one: Drawn, language: Language): void {
  one.slider.addEventListener('input', () => {
    const width = Number(one.slider.value)
    const fits = isFitting(one.panel, width)
    one.readout.textContent = `${language}: now ${width} px -- ${fits ? 'fits' : 'scrollbar or 3+ name lines'}`
  })
}

function render(language: Language, theme: 'light' | 'dark'): Record<string, number | null> {
  isChoiceKept = language === 'ja'
  const look = { preference: theme, hue: schedule.project.themeHue ?? 0 } as never
  document.body.style.cssText = themeStyle(look) + pageGroundStyle(look) +
    'margin:0;padding:12px;font-family:"Yu Gothic UI","Yu Gothic",YuGothic,"BIZ UDPGothic",sans-serif;'
  const row = document.getElementById('faces') as HTMLElement
  row.replaceChildren()
  const drawn = FACES.map((face) => drawFace(face, language, row)).filter((one): one is Drawn => one !== null)
  const found = measureAll(drawn, language)
  drawn.forEach((one) => wireSlider(one, language))
  ;(document.getElementById('result') as HTMLElement).textContent = JSON.stringify({ language, least: found })
  return found
}

let language: Language = 'ja'
let theme: 'light' | 'dark' = 'light'
;(window as unknown as { measure: (l: Language) => Record<string, number | null> }).measure = (chosen) => {
  language = chosen
  return render(language, theme)
}
document.getElementById('lang')?.addEventListener('click', () => {
  language = language === 'ja' ? 'en' : 'ja'
  render(language, theme)
})
document.getElementById('theme')?.addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light'
  render(language, theme)
})
render(language, theme)

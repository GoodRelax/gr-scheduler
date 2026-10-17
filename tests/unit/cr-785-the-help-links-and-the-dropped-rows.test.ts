// CR-785: the two help links, the IC-20 link in S-503 underlined, and the rows (MK-15, MK-16, MK-17, IC-18, note *1) the help drops.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { helpModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import {
  screenViewFromRegions,
  type DisplayLanguage,
  type HelpModal,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { ABOUT_ADDRESS, DOWNLOAD_ADDRESS, REPOSITORY_ADDRESS } from '../fixtures/download-address'
import {
  oneByRole,
  paintedColor,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'

type Words = Readonly<Record<string, string>>

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

interface Manuscript {
  readonly icons: readonly { readonly rowId: string; readonly label: Words; readonly hint: Words }[]
  readonly helpLinks?: readonly { readonly link: string; readonly rowId?: string; readonly text: Words }[]
  readonly helpNotes?: readonly { readonly rowId: string; readonly text: Words }[]
  readonly helpFootnotes?: unknown
}

const DICTIONARY = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Manuscript

const linkWords = (link: string, language: DisplayLanguage): string => {
  const found = (DICTIONARY.helpLinks ?? []).find((one) => one.link === link)?.text[language]
  if (found === undefined) throw new Error(`the dictionary has no helpLinks ${link} in ${language}`)
  return found
}

const iconWords = (rowId: string): { readonly label: Words; readonly hint: Words } => {
  const found = DICTIONARY.icons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary has no icons ${rowId}`)
  return found
}

const T_109 = specTable('T-109')
const T_236 = specTable('T-236')

const t109Row = (id: string): (typeof T_109.rows)[number] => {
  const found = T_109.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-109 has no row ${id}`)
  return found
}

const surfacesOf = (id: string): readonly string[] =>
  Array.from((t109Row(id).by['面'] ?? '').matchAll(/`([^`]+)`/g), (one) => one[1] ?? '')

const S_503 = T_236.rows.find((one) => one.id === 'S-503')
const LINK_INK = {
  light: bare(S_503?.by['明るいテーマ'] ?? '').toLowerCase(),
  dark: bare(S_503?.by['暗いテーマ'] ?? '').toLowerCase(),
}

const ROWS_LEFT_OFF_THE_HELP = ['MK-15', 'MK-16', 'MK-17', 'IC-18']

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const SETTINGS = { ...SETTINGS_DEFAULTS, taskGroupPanelWidthPx: 400 } as unknown as DocumentSettings

const REGIONS: ScreenRegions = (() => {
  const width = 1920
  const height = 1080
  const headerHeight = 56
  const rulerHeightPx = 48
  const titleWidth = SETTINGS.taskGroupPanelWidthPx
  const propertiesWidth = 300
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const taskGroupAreaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const taskGroupAreaHeight = canvas.height - rulerHeightPx - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    taskGroupPanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, taskGroupAreaWidth, rulerHeightPx),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    taskGroupArea: rect(canvas.x + titleWidth, canvas.y + rulerHeightPx, taskGroupAreaWidth, taskGroupAreaHeight),
  }
})()

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  themePreference: 'light',
  themeHue: 214,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const sessionWith = (
  screenLanguage: DisplayLanguage,
  helpLanguage: DisplayLanguage,
  isHelpShown: boolean,
): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage,
    helpLanguage,
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), taskGroupIds: [] },
    },
    ...(isHelpShown ? { helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } } : {}),
  },
}) as unknown as ScreenSession

const viewOf = (
  screenLanguage: DisplayLanguage,
  helpLanguage: DisplayLanguage,
  isHelpShown: boolean,
  readings: Partial<ScreenViewReadings> = {},
): ScreenView =>
  screenViewFromRegions(
    REGIONS,
    SCHEDULE,
    SETTINGS,
    emptySelection(),
    sessionWith(screenLanguage, helpLanguage, isHelpShown),
    emptyDialogueLog(),
    { ...READINGS, ...readings },
  )

const helpOf = (helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): HelpModal => {
  const modal = viewOf(screenLanguage, helpLanguage, true).helpModal
  if (modal === undefined || modal === null) throw new Error('the help is not in the view')
  return modal
}

const AREA = { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 } }

const EMPTY_VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'en',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

interface Drawn {
  readonly built: Stage
  readonly help: FakeElement
}

function drawnHelp(
  helpLanguage: DisplayLanguage,
  screenLanguage: DisplayLanguage = helpLanguage,
  preference: 'light' | 'dark' = 'light',
): Drawn {
  const session = sessionWith(screenLanguage, helpLanguage, true)
  const modal = helpModalFromSession(session, AREA)
  if (modal === null) throw new Error('the help is open but nothing describes it')
  const theme: ScreenTheme = { preference, hue: 214 }
  const built = wire(theme, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, language: screenLanguage, helpModal: modal })
  return { built, help: oneByRole(built.root(), 'Help Modal') }
}

const withAttribute = (root: FakeElement, name: string, value: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute(name) === value)

const anchorsIn = (root: FakeElement): FakeElement[] => selfAndDescendants(root).filter((one) => one.tagName === 'A')

function theLine(help: FakeElement, link: string): FakeElement {
  const found = withAttribute(help, 'data-help-link', link).filter((one) => one.tagName !== 'A')
  if (found.length !== 1) {
    throw new Error(`expected exactly one line [data-help-link="${link}"], found ${found.length}: ${whatWasDrawn(help).slice(0, 600)}`)
  }
  return found[0] as FakeElement
}

function theOnlyAnchorIn(line: FakeElement): FakeElement {
  const anchors = anchorsIn(line)
  if (anchors.length !== 1) throw new Error(`expected one anchor, found ${anchors.length}: ${whatWasDrawn(line)}`)
  return anchors[0] as FakeElement
}

function frameOfBasics(help: FakeElement): FakeElement {
  const blocks = withAttribute(help, 'data-help-block', 'basics')
  if (blocks.length !== 1) throw new Error(`expected one [data-help-block="basics"], found ${blocks.length}`)
  const block = blocks[0] as FakeElement
  const column = block.closest('[data-help-column]')
  if (column === null) throw new Error('the basics block stands in no help column')
  let at: FakeElement = block
  while (at.parentNode !== null && at.parentNode !== column) at = at.parentNode
  return at
}

const previousElementOf = (element: FakeElement): FakeElement | null => {
  const siblings = element.parentNode?.children ?? []
  const at = siblings.indexOf(element)
  return at > 0 ? (siblings[at - 1] as FakeElement) : null
}

const declared = (element: FakeElement, name: string): string => {
  const attribute = element.getAttribute(name)
  if (attribute !== null) return attribute
  const property = (element as unknown as Record<string, unknown>)[name]
  return typeof property === 'string' ? property : ''
}

// WHY: color and text-decoration pass down the tree, so the nearest write at or above the anchor is what the reader sees.
function nearestStyle(element: FakeElement, property: string, stop: FakeElement): string {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const written = styleMap(at).get(property)
    if (written !== undefined && written.trim() !== '') return written
    if (at === stop) break
  }
  return ''
}

const isUnderlined = (anchor: FakeElement, help: FakeElement): boolean =>
  /underline/.test(
    `${nearestStyle(anchor, 'text-decoration', help)} ${nearestStyle(anchor, 'text-decoration-line', help)}`,
  )

function inkOf(built: Stage, anchor: FakeElement, help: FakeElement): string {
  const own = paintedColor(built, anchor)
  if (own !== '') return own
  for (let at: FakeElement | null = anchor.parentNode; at !== null; at = at.parentNode) {
    const painted = paintedColor(built, at)
    if (painted !== '') return painted
    if (at === help) break
  }
  return ''
}

describe('CR-785 -- the premises read from the specification', () => {
  it('FR-036 puts two links, one per line, above the frame of the basics block, and names the dictionary section', () => {
    expect(REQUIREMENTS).toContain('の枠のすぐ上に、2 つのリンクを 1 行ずつ縦に並べて置くこと（MUST）')
    expect(REQUIREMENTS).toContain('2 つのリンクの語は `FR-038` の辞書（`helpLinks` の `download` と `about`）が持つこと（MUST）')
  })

  it('FR-036 sends the upper link to S-350 and the lower to S-583 plus ?lang=, both in a new tab', () => {
    expect(REQUIREMENTS).toContain('上のリンクの宛先は `_assets/tbl-settings.md` の 表 T-206 の `S-350`（最新版を入手する頁）')
    expect(REQUIREMENTS).toContain('下のリンクの宛先は同表の `S-583` の所にヘルプの言語を `?lang=ja` ／ `?lang=en` で付けたもの')
    expect(REQUIREMENTS).toContain('どちらも押したら閲覧環境の新しいタブで開くこと（MUST）')
  })

  it('FR-036 draws every help link in S-503 with an underline: the two, the IC-20 one and the FR-069 copyright', () => {
    expect(REQUIREMENTS).toContain('この 2 つ、`IC-20` の項目に添えるリンク、`FR-069` の著作権表示 —— の字は、`_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で下線を引いて描くこと（MUST）')
  })

  it('FR-036 gives the IC-20 item a link after its name, unparenthesised; only IC-54 keeps parentheses', () => {
    expect(REQUIREMENTS).toContain('`IC-20` の項目には、名の語の後ろに、最新版を入手する頁（`_assets/tbl-settings.md` の 表 T-206 の `S-350`）へのリンクを添え、押したら閲覧環境の新しいタブで開くこと（MUST）')
    expect(REQUIREMENTS).toContain('⭐ `IC-54` の項目に添える語は、丸括弧で囲むこと（MUST）')
    expect(REQUIREMENTS).toContain('`IC-20` に添えるリンクは囲まない')
  })

  it('FR-036 names MK-2 / MK-5 / MK-7 alone of table T-023 and puts MK-15 / MK-16 / MK-17 among the rows learned by touching', () => {
    expect(REQUIREMENTS).toContain('表 T-023 の `MK-2` / `MK-5` / `MK-7` と、下の 表 T-255 の行を示すこと（MUST）')
    expect(REQUIREMENTS).toContain('`MK-13` / `MK-15` / `MK-16` / `MK-17`）と、内部の取り決め')
  })

  it('table T-109 stands IC-18 on the Dialogue Field alone and IC-20 on the App Header', () => {
    expect(surfacesOf('IC-18')).toEqual(['Dialogue Field'])
    expect(surfacesOf('IC-20')).toContain('App Header')
  })

  it('FR-066 says the field cannot be opened for now', () => {
    expect(REQUIREMENTS).toContain('いま `IC-18` は 表 T-109 で `Dialogue Field` の面だけに在り、`App Header` に無い')
    expect(REQUIREMENTS).toContain('対話欄を開く入口はほかに無いので、欄はいま開かない。')
  })

  it('the dictionary holds helpLinks download, about and agentApi in both languages, with no footnote and one helpNotes word', () => {
    expect((DICTIONARY.helpLinks ?? []).map((one) => one.link)).toEqual(['download', 'about', 'agentApi'])
    for (const link of ['download', 'about', 'agentApi']) {
      for (const language of LANGUAGES) expect(linkWords(link, language).trim().length, `${link} ${language}`).toBeGreaterThan(0)
      expect(linkWords(link, 'ja'), link).not.toBe(linkWords(link, 'en'))
    }
    expect((DICTIONARY.helpLinks ?? []).find((one) => one.link === 'agentApi')?.rowId).toBe('IC-20')
    expect(DICTIONARY.helpFootnotes).toBeUndefined()
    expect((DICTIONARY.helpNotes ?? []).map((one) => one.rowId)).toEqual(['IC-54'])
  })

  it('S-350 and S-583 are https addresses without a query of their own, and are two different pages', () => {
    for (const address of [DOWNLOAD_ADDRESS, ABOUT_ADDRESS]) {
      expect(address).toMatch(/^https:\/\/\S+$/)
      expect(address).not.toContain('?')
    }
    expect(DOWNLOAD_ADDRESS).not.toBe(ABOUT_ADDRESS)
  })

  it('S-503 states a light and a dark colour', () => {
    expect(LINK_INK.light).toMatch(/^#[0-9a-f]{6}$/)
    expect(LINK_INK.dark).toMatch(/^#[0-9a-f]{6}$/)
    expect(LINK_INK.light).not.toBe(LINK_INK.dark)
  })
})

describe('FR-036 (MUST) -- the download link, above the overview link (HelpModal.downloadLink)', () => {
  it.each(LANGUAGES)('%s: the words are the dictionary words for download in the help language', (language) => {
    expect(helpOf(language).downloadLink.words).toBe(linkWords('download', language))
  })

  it.each(LANGUAGES)('%s: the address is S-350 as it stands, with no ?lang', (language) => {
    const address = helpOf(language).downloadLink.address
    expect(address).toBe(DOWNLOAD_ADDRESS)
    expect(address).not.toContain('lang')
  })

  it('the words follow the help language and the address is the same in both', () => {
    expect(helpOf('ja').downloadLink.words).not.toBe(helpOf('en').downloadLink.words)
    expect(helpOf('ja').downloadLink.address).toBe(helpOf('en').downloadLink.address)
  })

  it.each(LANGUAGES)('%s: the words follow the HELP language, not the screen language', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    expect(helpOf(language, other).downloadLink.words).toBe(linkWords('download', language))
  })
})

describe('FR-036 (MUST) -- the overview link, below the download link (HelpModal.aboutLink)', () => {
  it.each(LANGUAGES)('%s: the words are the dictionary words for about', (language) => {
    expect(helpOf(language).aboutLink.words).toBe(linkWords('about', language))
  })

  it.each(LANGUAGES)('%s: the address is S-583 plus ?lang= plus the help language', (language) => {
    expect(helpOf(language).aboutLink.address).toBe(`${ABOUT_ADDRESS}?lang=${language}`)
  })

  it.each(LANGUAGES)('%s: both follow the HELP language, not the screen language', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    const link = helpOf(language, other).aboutLink
    expect(link.words).toBe(linkWords('about', language))
    expect(link.address).toBe(`${ABOUT_ADDRESS}?lang=${language}`)
  })
})

describe('FR-036 (MUST) -- the IC-20 item carries a link to S-350 after its name (HelpEntry.link)', () => {
  it.each(LANGUAGES)('%s: the IC-20 item has the agentApi words and the S-350 address', (language) => {
    const items = helpOf(language).entries.filter((one) => one.row === 'IC-20')
    expect(items).toHaveLength(1)
    expect(items[0]?.link).toEqual({ words: linkWords('agentApi', language), address: DOWNLOAD_ADDRESS })
  })

  it.each(LANGUAGES)('%s: the item text is the name words only -- no parentheses, no link words, no address', (language) => {
    const text = helpOf(language).entries.find((one) => one.row === 'IC-20')?.text ?? ''
    expect(text).toBe(iconWords('IC-20').label[language])
    expect(/[()（）]/.test(text)).toBe(false)
    expect(text.includes(linkWords('agentApi', language))).toBe(false)
    expect(text.includes(DOWNLOAD_ADDRESS)).toBe(false)
  })

  it.each(LANGUAGES)('%s: no other item carries a link', (language) => {
    const carrying = helpOf(language).entries.filter((one) => one.link !== null).map((one) => one.row)
    expect(carrying).toEqual(['IC-20'])
  })

  it.each(LANGUAGES)('%s: the IC-54 item keeps its word in parentheses', (language) => {
    const word = (DICTIONARY.helpNotes ?? []).find((one) => one.rowId === 'IC-54')?.text[language] ?? ''
    expect(word.startsWith('(') && word.endsWith(')')).toBe(true)
    const text = helpOf(language).entries.find((one) => one.row === 'IC-54')?.text ?? ''
    expect(text.endsWith(word)).toBe(true)
  })
})

describe('FR-036 (MUST) -- note *1 is gone', () => {
  it.each(LANGUAGES)('%s: the help carries no footnotes member', (language) => {
    expect('footnotes' in helpOf(language)).toBe(false)
  })

  it.each(LANGUAGES)('%s: no item text carries the address S-350 or the {downloadUrl} seat', (language) => {
    const carrying = helpOf(language).entries.filter(
      (one) => one.text.includes(DOWNLOAD_ADDRESS) || one.text.includes('{downloadUrl}'),
    )
    expect(carrying.map((one) => one.row)).toEqual([])
  })
})

describe('FR-036 (MUST) -- MK-15, MK-16, MK-17 and IC-18 are not in the help', () => {
  it.each(LANGUAGES)('%s: no item stands on any of the four rows', (language) => {
    const rows = helpOf(language).entries.map((one) => one.row)
    for (const row of ROWS_LEFT_OFF_THE_HELP) expect(rows, row).not.toContain(row)
  })

  it.each(LANGUAGES)('%s: MK-2, MK-5 and MK-7 of table T-023 still stand in it', (language) => {
    const rows = helpOf(language).entries.filter((one) => one.table === 'T-023').map((one) => one.row)
    expect([...rows].sort()).toEqual(['MK-2', 'MK-5', 'MK-7'])
  })

  it.each(LANGUAGES)('%s: no item names the Dialogue Field entrance by its icon', (language) => {
    const icons = helpOf(language).entries.flatMap((one) => [one.icon, ...one.glyphs])
    expect(icons).not.toContain('IC-18')
  })
})

describe('FR-066 / T-109 -- IC-18 is not in the App Header (JDG-2506)', () => {
  it.each(LANGUAGES)('%s: the header items do not hold IC-18', (language) => {
    const icons = viewOf(language, language, false).appHeaderItems.commands.map((one) => one.icon)
    expect(icons).not.toContain('IC-18')
  })

  it.each(LANGUAGES)('%s: the header still holds the other entrances of the AI group, IC-20 and IC-115', (language) => {
    const icons = viewOf(language, language, false).appHeaderItems.commands.map((one) => one.icon)
    expect(icons).toContain('IC-20')
    expect(icons).toContain('IC-115')
  })

  it('every entrance the header holds stands on the App Header in table T-109', () => {
    const icons = viewOf('en', 'en', false).appHeaderItems.commands.map((one) => String(one.icon))
    const foreign = icons.filter((one) => /^IC-\d+$/.test(one) && !surfacesOf(one).includes('App Header'))
    expect(foreign).toEqual([])
  })
})

describe('FR-038 -- the IC-20 tooltip words (display-words icons IC-20 hint)', () => {
  const tooltipOf = (language: DisplayLanguage): string | undefined => {
    const view = viewOf(language, language, false, {
      pointer: { x: REGIONS.appHeader.x + 10, y: REGIONS.appHeader.y + 10 },
      iconUnderPointer: 'IC-20',
      pointerRestedMs: SETTINGS_CONSTANTS.iconHintDelayMs + 1,
      hintTargetDwellMs: SETTINGS_CONSTANTS.iconHintDelayMs + 1,
    })
    return view.tooltips.find((one) => one.anchor.kind === 'icon' && one.anchor.icon === 'IC-20')?.text
  }

  it.each(LANGUAGES)('%s: the tooltip is the dictionary hint, which points at the help and not at a bundle', (language) => {
    const hint = iconWords('IC-20').hint[language] ?? ''
    expect(tooltipOf(language)).toBe(hint)
    expect(hint.includes('.mcpb')).toBe(false)
  })

  it('the tooltip differs between the two languages', () => {
    expect(tooltipOf('ja')).not.toBe(tooltipOf('en'))
  })
})

describe('FR-036 (MUST) -- the two links are drawn one per line, right above the frame of the basics block', () => {
  it.each(LANGUAGES)('%s: one line for each of the two links, and no footnote', (language) => {
    const { help } = drawnHelp(language)
    expect(withAttribute(help, 'data-help-link', 'download').filter((one) => one.tagName !== 'A')).toHaveLength(1)
    expect(withAttribute(help, 'data-help-link', 'about').filter((one) => one.tagName !== 'A')).toHaveLength(1)
    expect(selfAndDescendants(help).filter((one) => one.getAttribute('data-help-footnote') !== null)).toHaveLength(0)
  })

  it.each(LANGUAGES)('%s: the download line, then the about line, then the frame of the basics block, as siblings', (language) => {
    const { help } = drawnHelp(language)
    const download = theLine(help, 'download')
    const about = theLine(help, 'about')
    const frame = frameOfBasics(help)
    expect(about.parentNode, `the column reads ${whatWasDrawn(frame.parentNode as FakeElement).slice(0, 500)}`).toBe(frame.parentNode)
    expect(download.parentNode).toBe(frame.parentNode)
    expect(previousElementOf(frame)).toBe(about)
    expect(previousElementOf(about)).toBe(download)
  })

  it.each(LANGUAGES)('%s: both stand in the help column that holds the basics block', (language) => {
    const { help } = drawnHelp(language)
    const column = frameOfBasics(help).closest('[data-help-column]')
    expect(column).not.toBeNull()
    expect(theLine(help, 'download').closest('[data-help-column]')).toBe(column)
    expect(theLine(help, 'about').closest('[data-help-column]')).toBe(column)
  })

  it.each(LANGUAGES)('%s: the download line is a link to S-350 with the dictionary words, opened in a new tab', (language) => {
    const line = theLine(drawnHelp(language).help, 'download')
    const anchor = theOnlyAnchorIn(line)
    expect(declared(anchor, 'href')).toBe(DOWNLOAD_ADDRESS)
    expect(declared(anchor, 'target')).toBe('_blank')
    expect(line.textContent).toContain(linkWords('download', language))
    expect(line.textContent).not.toContain(linkWords('about', language))
  })

  it.each(LANGUAGES)('%s: the about line is a link to S-583 plus ?lang=, with the dictionary words, opened in a new tab', (language) => {
    const line = theLine(drawnHelp(language).help, 'about')
    const anchor = theOnlyAnchorIn(line)
    expect(declared(anchor, 'href')).toBe(`${ABOUT_ADDRESS}?lang=${language}`)
    expect(declared(anchor, 'target')).toBe('_blank')
    expect(line.textContent).toContain(linkWords('about', language))
    expect(line.textContent).not.toContain(linkWords('download', language))
  })

  it.each(LANGUAGES)('%s: the drawn words and the about address follow the help language when the screen language differs', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    const { help } = drawnHelp(language, other)
    expect(theLine(help, 'download').textContent).toContain(linkWords('download', language))
    expect(declared(theOnlyAnchorIn(theLine(help, 'about')), 'href')).toBe(`${ABOUT_ADDRESS}?lang=${language}`)
  })
})

describe('FR-036 (MUST) -- the IC-20 item draws its link after its name, in a new tab', () => {
  const itemOf = (help: FakeElement): FakeElement => {
    const found = selfAndDescendants(help).filter(
      (one) => one.getAttribute('data-table') !== null && one.getAttribute('data-row') === 'IC-20',
    )
    if (found.length !== 1) throw new Error(`expected one item for IC-20, found ${found.length}`)
    return found[0] as FakeElement
  }

  it.each(LANGUAGES)('%s: one a[data-help-link="agentApi"] in the item, to S-350, with the dictionary words', (language) => {
    const { help } = drawnHelp(language)
    const anchors = anchorsIn(itemOf(help)).filter((one) => one.getAttribute('data-help-link') === 'agentApi')
    expect(anchors).toHaveLength(1)
    const anchor = anchors[0] as FakeElement
    expect(declared(anchor, 'href')).toBe(DOWNLOAD_ADDRESS)
    expect(declared(anchor, 'target')).toBe('_blank')
    expect(anchor.textContent).toBe(linkWords('agentApi', language))
    expect(withAttribute(help, 'data-help-link', 'agentApi')).toHaveLength(1)
  })

  it.each(LANGUAGES)('%s: the link comes after the name and nothing round it is a parenthesis', (language) => {
    const { help } = drawnHelp(language)
    const item = itemOf(help)
    const words = linkWords('agentApi', language)
    const name = iconWords('IC-20').label[language] ?? ''
    const text = item.textContent
    expect(text.includes(name)).toBe(true)
    expect(text.indexOf(words)).toBeGreaterThan(text.indexOf(name))
    const withoutLink = text.split(words).join('')
    expect(/[()（）]/.test(withoutLink)).toBe(false)
  })

  it.each(LANGUAGES)('%s: no other item draws a link', (language) => {
    const { help } = drawnHelp(language)
    const others = selfAndDescendants(help).filter(
      (one) => one.getAttribute('data-table') !== null && one.getAttribute('data-row') !== 'IC-20' && anchorsIn(one).length > 0,
    )
    expect(others.map((one) => one.getAttribute('data-row'))).toEqual([])
  })

  it.each(LANGUAGES)('%s: no item is drawn for MK-15, MK-16, MK-17 or IC-18', (language) => {
    const { help } = drawnHelp(language)
    const drawnRows = selfAndDescendants(help)
      .filter((one) => one.getAttribute('data-table') !== null)
      .map((one) => one.getAttribute('data-row') ?? '')
    for (const row of ROWS_LEFT_OFF_THE_HELP) expect(drawnRows, row).not.toContain(row)
  })
})

describe('FR-036 (MUST) -- every help link is drawn in the S-503 colour with an underline', () => {
  const repositoryAnchorIn = (help: FakeElement): FakeElement => {
    const found = anchorsIn(help).filter((one) => declared(one, 'href') === REPOSITORY_ADDRESS)
    if (found.length !== 1) throw new Error(`expected one copyright link to ${REPOSITORY_ADDRESS}, found ${found.length}`)
    return found[0] as FakeElement
  }

  const linksOf = (help: FakeElement): readonly (readonly [string, FakeElement])[] => [
    ['download', theOnlyAnchorIn(theLine(help, 'download'))],
    ['about', theOnlyAnchorIn(theLine(help, 'about'))],
    ['agentApi', withAttribute(help, 'data-help-link', 'agentApi').filter((one) => one.tagName === 'A')[0] as FakeElement],
    ['copyright (FR-069)', repositoryAnchorIn(help)],
  ]

  describe.each(LANGUAGES)('%s', (language) => {
    it.each(['light', 'dark'] as const)('%s theme: the ink is the S-503 value of that theme', (preference) => {
      const { built, help } = drawnHelp(language, language, preference)
      for (const [name, anchor] of linksOf(help)) {
        expect(inkOf(built, anchor, help), `${name} in ${preference}`).toBe(LINK_INK[preference])
      }
    })

    it('every one of the four is underlined', () => {
      const { help } = drawnHelp(language)
      for (const [name, anchor] of linksOf(help)) {
        expect(isUnderlined(anchor, help), name).toBe(true)
      }
    })
  })

  it('the copyright notice link opens the repository page in a new tab', () => {
    const anchor = repositoryAnchorIn(drawnHelp('en').help)
    expect(declared(anchor, 'target')).toBe('_blank')
  })
})

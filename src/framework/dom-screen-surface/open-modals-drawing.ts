// DomScreenSurface -- the surfaces opened on top (IN-4), one kind of surface at a time.
// @unit      UF-109  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import {
  DEFAULT_WINDOW_PLACE,
  windowBoxOf,
  windowNormalBoxOf,
  type CommandItem,
  type HelpModal,
  type OpenModal,
  type ScreenPart,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  IMPORT_REPORT_DISMISS_ATTRIBUTE,
  NOT_STORED_EXPORT_CHOOSER_SIZES,
  NOT_STORED_HELP_SIZES,
  NOT_STORED_ICON_SIZES,
  NOT_STORED_RESOURCE_ROSTER_SIZES,
  NOT_STORED_WHEEL_UNITS,
  PAINT,
  STYLE,
  anchorKey,
  anchoredEntry,
  appendAssignment,
  boxStyle,
  chromeScaledPx,
  entranceOuterHeightPx,
  entryStyle,
  fillEntry,
  made,
  part,
} from './dom-screen-surface'
import { drawLanguageReading, spelledFileSize } from './app-header-drawing'
import { confirmationAnswerElement, linkElement, nextStepElement } from './notices-drawing'
import { windowPartAt, windowPartOf, windowTitleRowElement, type PlacedWindow, type PointAsked } from './window-frame-drawing'
import { paletteGroupRuleStyle } from './command-palette-drawing'
import type { TextEntryControl } from './field-editing'
import { fieldElement } from './properties-panel-drawing'

const ROSTER_CHOSEN_ENTRY = 'IC-67'
const CLOSE_SURFACE_ENTRY = 'IC-52'
const ROSTER_UNCHOSEN_ENTRY = 'IC-68'
const HELP_LANGUAGE_ENTRY = 'IC-128'
const HELP_SURFACE = 'Help Modal'

const MODAL_BORDER_PX = 1

// WHY: right-aligned above the licence line (JDG-1396); anywhere, as the address has no space to break at.
const HELP_FOOTNOTE_STYLE = 'text-align:right;overflow-wrap:anywhere;'

// STOP: spec does not decide how parts with no T-103 or T-109 row are marked for read-back. Looked in W-4, IF-9
// @provisional PND-474
const WATERMARK_UNLOCK_ENTRY_ATTRIBUTE = 'data-watermark-unlock'

// see FR-036, T-256, S-457, S-458
// TRAP: a height bound here (flex:1 with min-height:0, or column-fill over a bounded box) sends a
// block that does not fit into a column added to the right, and the help scrolls sideways.
// WHY: the floor is the opened column width where that is under S-458, so the opened help never scrolls sideways.
/** @purity pure */
function helpColumnsStyle(openedBodyWidthPx: number): string {
  const count = NOT_STORED_HELP_SIZES['S-202']
  const gap = NOT_STORED_HELP_SIZES['S-457']
  const openedColumn = `calc((${openedBodyWidthPx}px - ${(count + 1) * gap}em) / ${count})`
  const floor = `min(${NOT_STORED_HELP_SIZES['S-458']}em, ${openedColumn})`
  return (
    `display:grid;grid-template-columns:repeat(${count},minmax(${floor},1fr));` +
    `column-gap:${gap}em;align-items:start;flex:0 0 auto;`
  )
}

/** @purity pure */
function helpColumnStyle(): string {
  return `${STYLE.helpColumn}display:flex;flex-direction:column;row-gap:${NOT_STORED_HELP_SIZES['S-457']}em;`
}

// see FR-036, S-437, S-457
/** @purity pure */
function helpBlockFrameStyle(): string {
  return (
    `${STYLE.helpBlock}border:${NOT_STORED_HELP_SIZES['S-437']}px solid ${PAINT.rule};` +
    `padding:${NOT_STORED_HELP_SIZES['S-457']}em;`
  )
}

// see FR-036, WB-1, S-201
/** @purity pure */
function defaultHelpBox(belowAppHeader: ScreenRect): ScreenRect {
  const share = NOT_STORED_HELP_SIZES['S-201']
  const width = belowAppHeader.width * share
  const height = belowAppHeader.height * share
  return {
    x: belowAppHeader.x + (belowAppHeader.width - width) / 2,
    y: belowAppHeader.y + (belowAppHeader.height - height) / 2,
    width,
    height,
  }
}

// see FR-036, T-335, WB-1, WB-3, S-455
/** @purity pure */
function helpPlacedOf(modal: HelpModal): PlacedWindow {
  const range = modal.area.belowAppHeader
  const place = windowNormalBoxOf(modal.place ?? DEFAULT_WINDOW_PLACE, defaultHelpBox(modal.area.belowAppHeader), range)
  const box = windowBoxOf(modal.windowState, place, range, entranceOuterHeightPx())
  return { window: 'helpModal', shown: modal.windowState, place, box, range }
}

// see FR-036, T-335
/** @purity pure */
function helpWindowStyle(placed: PlacedWindow): string {
  const frame =
    `${STYLE.modal}display:flex;flex-direction:column;overflow:hidden;padding:0;` +
    `transform:none;max-width:none;max-height:none;font-size:${NOT_STORED_HELP_SIZES['S-203']}em;`
  if (placed.shown !== 'minimised') return frame + boxStyle(placed.box)
  // WHY: WB-2 shrinks the title row to its content, so only the restore box's bottom-right corner is placed.
  const { range, place } = placed
  const right = range.x + range.width - (place.x + place.width)
  const bottom = range.y + range.height - (place.y + place.height)
  return frame + `left:auto;top:auto;right:${right}px;bottom:${bottom}px;width:max-content;height:auto;`
}

// see FR-036, WB-1
/** @purity pure */
function openedHelpBodyWidthPx(modal: HelpModal, gutterPx: number): number {
  return defaultHelpBox(modal.area.belowAppHeader).width - MODAL_BORDER_PX * 2 - gutterPx
}

interface HelpColumnsDrawn {
  readonly body: HTMLElement
  readonly columns: HTMLElement
}

// see FR-036, S-458
// WHY: the gutter is measured once the help is in the page; the host is never asked (LY-5), and a host with no layout keeps 0.
/** @purity non-pure */
function fitHelpColumnFloor(drawn: HelpColumnsDrawn | null, modal: HelpModal): void {
  if (drawn === null) return
  const gutterPx = drawn.body.offsetWidth - drawn.body.clientWidth
  if (!Number.isFinite(gutterPx) || gutterPx <= 0) return
  drawn.columns.setAttribute('style', helpColumnsStyle(openedHelpBodyWidthPx(modal, gutterPx)))
}

// see FR-036, S-437, S-457, CR-621
/** @purity pure */
function helpBodyStyle(): string {
  return (
    'flex:1 1 auto;min-height:0;overflow:auto;scrollbar-gutter:stable;' +
    `display:flex;flex-direction:column;padding:${NOT_STORED_HELP_SIZES['S-457']}em;` +
    `border-top:${NOT_STORED_HELP_SIZES['S-437']}px solid ${PAINT.rule};`
  )
}

// see FR-036
// TRAP: the tooltip joins with the same one; EZ-2 forbids the pair built two ways.
const ASSIGNMENT_SEPARATOR = ' \uFF0F '

const HELP_GLYPH_GAP_EM = 0.5

// see FR-036, S-436
// WHY: margin-left:auto, not only the growing explanation, so an assignment sent to the next line stays right.
/** @purity pure */
function helpItemStyles(glyphCount: number): {
  readonly row: string
  readonly glyph: string
  readonly text: string
  readonly keys: string
} {
  const slot = `${chromeScaledPx(NOT_STORED_ICON_SIZES['S-138']) * glyphCount}px + ${HELP_GLYPH_GAP_EM}em`
  return {
    row: `${STYLE.helpEntry}position:relative;padding-left:calc(${slot});`,
    glyph: `${STYLE.helpGlyph}position:absolute;left:0;top:0;height:1lh;`,
    text: `${STYLE.helpText}flex:1 1 auto;margin-right:${NOT_STORED_HELP_SIZES['S-436']}em;`,
    keys: `${STYLE.helpKeys}margin-left:auto;`,
  }
}

// see FR-099
/** @purity non-pure */
function rosterSelectionEntry(host: Document, isSelected: boolean): HTMLElement {
  const icon = isSelected ? ROSTER_CHOSEN_ENTRY : ROSTER_UNCHOSEN_ENTRY
  const entry = made(host, 'button', entryStyle())
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

// see FR-036, IC-102
// WHY: no data-icon, so the pointer never reads the legend as an entrance to press.
/** @purity non-pure */
function helpLegendElement(host: Document, item: CommandItem): HTMLElement {
  const legend = made(host, 'span', STYLE.helpLegend)
  legend.setAttribute('data-legend', item.icon)
  const glyph = made(host, 'span', STYLE.helpGlyph)
  fillEntry(host, glyph, item.icon)
  const word = made(host, 'span', '')
  word.textContent = item.label
  legend.append(glyph, word)
  return legend
}

// see FR-036
/** @purity non-pure */
function helpItemElement(
  host: Document,
  line: OpenHelpEntry,
  glyphs: readonly string[],
): { readonly row: HTMLElement; readonly text: HTMLElement } {
  const styles = helpItemStyles(glyphs.length)
  const row = made(host, 'div', styles.row)
  row.setAttribute('data-table', line.table)
  row.setAttribute('data-row', line.row)

  const glyph = made(host, 'span', styles.glyph)
  if (glyphs.length === 1) {
    fillEntry(host, glyph, glyphs[0] as string)
  } else {
    for (const one of glyphs) {
      const shape = made(host, 'span', STYLE.helpGlyph)
      fillEntry(host, shape, one)
      glyph.append(shape)
    }
  }
  row.append(glyph)

  const written = [line.keys, line.press]
    .filter((one): one is string => one !== null)
    .join(ASSIGNMENT_SEPARATOR)
  const text = made(host, 'span', written === '' ? STYLE.helpText : styles.text)
  text.textContent = line.text
  row.append(text)

  const assignment = made(host, 'span', styles.keys)
  if (written !== '') appendAssignment(host, assignment, written, false)
  row.append(assignment)
  return { row, text }
}

type OpenHelpEntry = Extract<OpenModal, { readonly entries: unknown }>['entries'][number]

type OpenChooser = Extract<OpenModal, { readonly choices: unknown }>

type ExportChooser = Extract<OpenModal, { readonly formats: unknown }>

type RosterLine = Extract<OpenModal, { readonly resources: unknown }>['resources'][number]

// see FR-099, RR-1, RR-2
// WHY: a column box, so the scroller below takes what is left and the heading row stays put.
/** @purity pure */
function rosterBoxStyle(): string {
  return (
    'display:flex;flex-direction:column;overflow:hidden;' +
    `font-size:${NOT_STORED_RESOURCE_ROSTER_SIZES['S-240']}em;`
  )
}

// see RR-5
// TRAP: screen px on purpose; S-234, S-235 and S-240 must not scale it, or the line drops below a pixel.
/** @purity pure */
function rosterRule(): string {
  return `${NOT_STORED_RESOURCE_ROSTER_SIZES['S-241']}px solid ${PAINT.rule}`
}

// see RR-4, RR-5
/** @purity pure */
function rosterCellStyle(isNameColumn: boolean, isFirstLine: boolean): string {
  return (
    `border-right:${rosterRule()};border-bottom:${rosterRule()};` +
    (isNameColumn ? `border-left:${rosterRule()};position:sticky;left:0;z-index:1;` : '') +
    (isFirstLine ? `border-top:${rosterRule()};` : '') +
    `padding:0.125em 0.5em;white-space:nowrap;vertical-align:middle;background:${PAINT.ground};`
  )
}

export const ROSTER_SCROLLER = '[data-roster-scroller]'

// see RR-2, RR-3
// WHY: choosing a line redraws the roster, and a fresh box would jump back to the first column.
/** @purity non-pure */
export function keepRosterScroll(before: Element | null, after: Element | null): void {
  if (before === null || after === null) return
  after.scrollLeft = before.scrollLeft
  after.scrollTop = before.scrollTop
}

// TRAP: a window or element wheel listener is passive by default, and a passive preventDefault is ignored.
const WHEEL_MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }

// see FR-099, T-257
// WHY: every line has as many cells as the longest, so every column is ruled on every line (RR-5).
/** @purity non-pure */
function rosterGridElement(host: Document, resources: readonly RosterLine[]): HTMLElement {
  const scroller = made(host, 'div', 'flex:1 1 auto;min-height:0;overflow:auto;')
  scroller.setAttribute('data-roster-scroller', 'true')
  const grid = made(host, 'table', 'border-collapse:separate;border-spacing:0;')
  const lines = made(host, 'tbody', '')
  const widest = resources.reduce((most, one) => Math.max(most, one.unassignedTaskNames.length), 0)
  resources.forEach((resource, at) => {
    const isFirstLine = at === 0
    const line = made(host, 'tr', '')
    line.setAttribute('data-uid', String(resource.uid))
    line.setAttribute('data-referenced', String(resource.isReferenced))
    line.setAttribute('data-selected', String(resource.isSelected))
    const name = made(host, 'td', rosterCellStyle(true, isFirstLine))
    name.setAttribute('data-roster-name', 'true')
    name.textContent = resource.name
    const choice = made(host, 'td', rosterCellStyle(false, isFirstLine))
    choice.append(rosterSelectionEntry(host, resource.isSelected))
    line.append(name, choice)
    for (let column = 0; column < widest; column += 1) {
      const cell = made(host, 'td', rosterCellStyle(false, isFirstLine))
      if (column < resource.unassignedTaskNames.length) {
        const taskName = resource.unassignedTaskNames[column] ?? null
        cell.setAttribute('data-unnamed', String(taskName === null))
        cell.textContent = taskName
      }
      line.append(cell)
    }
    lines.append(line)
  })
  grid.append(lines)
  scroller.append(grid)
  return scroller
}

// see RR-3, MK-5, T-023
// WHY: the translator already leaves the chart still while a surface stands, so the one exception
// T-023 names is kept where the scrolled box lives.
/** @purity non-pure */
function rosterSidewaysWheel(scroller: HTMLElement): (event: WheelEvent) => void {
  return (event) => {
    if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return
    event.preventDefault()
    const turned = event.deltaX !== 0 ? event.deltaX : event.deltaY
    scroller.scrollLeft += turned * wheelUnitPx(event, scroller)
  }
}

/** @purity semi-pure-b */
function wheelUnitPx(event: WheelEvent, scroller: HTMLElement): number {
  if (event.deltaMode === event.DOM_DELTA_PAGE) return scroller.clientWidth
  if (event.deltaMode === event.DOM_DELTA_LINE) return NOT_STORED_WHEEL_UNITS['S-514']
  return 1
}

// see FR-036, FR-053, T-256
// WHY: each entry names its column (table T-256), so a block is placed, never flowed.
/** @purity non-pure */
function helpColumnsElement(
  host: Document,
  entries: readonly OpenHelpEntry[],
  openedBodyWidthPx: number,
): HTMLElement {
  const columns = made(host, 'div', helpColumnsStyle(openedBodyWidthPx))
  const columnByRow = new Map<string, HTMLElement>()
  let block: HTMLElement | null = null
  let blockName: string | null = null
  let segment: string | null = null
  for (const line of entries) {
    const name = line.block
    const lineSegment = line.segment
    if (block === null || name !== blockName) {
      let column = columnByRow.get(line.column)
      if (column === undefined) {
        column = made(host, 'div', helpColumnStyle())
        column.setAttribute('data-help-column', line.column)
        columnByRow.set(line.column, column)
        columns.append(column)
      }
      const opened = made(host, 'div', helpBlockFrameStyle())
      opened.setAttribute('data-help-block', name)
      column.append(opened)
      block = opened
      blockName = name
      segment = lineSegment
    } else if (lineSegment !== segment) {
      // WHY: a heading is no group, so the first group under it takes no line (CR-665: one group, no line).
      if (segment !== null) block.append(made(host, 'div', paletteGroupRuleStyle()))
      segment = lineSegment
    }
    if (line.kind === 'heading') {
      const heading = made(host, 'div', STYLE.helpHeading)
      heading.setAttribute('data-help-heading', line.row)
      heading.textContent = line.text
      block.append(heading)
      continue
    }
    const drawnItem = helpItemElement(host, line, line.glyphs)
    block.append(drawnItem.row)
  }
  return columns
}

/** @purity non-pure */
function helpFootnoteElements(host: Document, footnotes: HelpModal['footnotes']): readonly HTMLElement[] {
  return footnotes.map((footnote) => {
    const note = made(host, 'div', HELP_FOOTNOTE_STYLE)
    note.setAttribute('data-help-footnote', 'true')
    note.append(nextStepElement(host, footnote.before, footnote.address === '' ? null : footnote))
    return note
  })
}

interface DrawnModal {
  readonly element: HTMLElement
  readonly watermarkUnlockEntry: TextEntryControl | null
  readonly helpColumns: HelpColumnsDrawn | null
}

// see FR-036, WB-7, GR-24
/** @purity non-pure */
function helpTitleRow(host: Document, modal: HelpModal, anchors: Map<string, HTMLElement>): HTMLElement {
  const titled = headingRowCommands(modal).filter((item) => item.icon !== modal.legend)
  const row = windowTitleRowElement(host, modal.heading, { before: [], titled }, anchors, HELP_SURFACE)
  const languageEntry = anchors.get(anchorKey({ kind: 'icon', icon: HELP_LANGUAGE_ENTRY })) ?? null
  if (languageEntry !== null) drawLanguageReading(host, languageEntry, modal.helpLanguage)
  const legendItem = modal.commands.find((item) => item.icon === modal.legend)
  if (legendItem !== undefined) row.insertBefore(helpLegendElement(host, legendItem), languageEntry)
  return row
}

/** @purity pure */
function isCloseOnlyTitled(modal: OpenModal): modal is ExportChooser | OpenChooser {
  return 'formats' in modal || 'choices' in modal
}

/** @purity non-pure */
function closeOnlyTitleRow(host: Document, modal: ExportChooser | OpenChooser, anchors: Map<string, HTMLElement>): HTMLElement {
  return windowTitleRowElement(host, modal.heading, { before: [], titled: closeEntriesOf(modal) }, anchors, modal.surface)
}

// see WB-10, FR-096, OP-16
// WHY: content sets the size, so a format's words are never wrapped by a share of the window (FR-096).
/** @purity pure */
function closeOnlyTitledFrameStyle(modal: ExportChooser | OpenChooser): string {
  const cap = 'formats' in modal ? 'max-width:none;' : ''
  return `${STYLE.modal}display:flex;flex-direction:column;overflow:hidden;padding:0;width:max-content;${cap}`
}

// see FR-029, RR-6
/** @purity non-pure */
function modalTitleRow(
  host: Document,
  modal: OpenModal,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  if ('entries' in modal) return helpTitleRow(host, modal, anchors)
  if (isCloseOnlyTitled(modal)) return closeOnlyTitleRow(host, modal, anchors)
  const header = made(host, 'div', STYLE.surfaceHeader)
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = modal.heading
  header.append(heading)
  const isCloseAtTheRightEnd = 'resources' in modal
  for (const item of headingRowCommands(modal)) {
    const entry = anchoredEntry(host, item, anchors)
    if (isCloseAtTheRightEnd && item.icon === CLOSE_SURFACE_ENTRY) pushToTheRightEnd(entry)
    header.append(entry)
  }
  return header
}

// see FR-036, RR-6
// WHY: the close entrance last, so it stands at the right end of the heading row on every surface.
/** @purity pure */
function headingRowCommands(modal: OpenModal): readonly CommandItem[] {
  return [...modal.commands.filter((item) => item.icon !== CLOSE_SURFACE_ENTRY), ...closeEntriesOf(modal)]
}

/** @purity pure */
function closeEntriesOf(modal: OpenModal): readonly CommandItem[] {
  return modal.commands.filter((item) => item.icon === CLOSE_SURFACE_ENTRY)
}

// see RR-6
/** @purity non-pure */
function pushToTheRightEnd(entry: HTMLElement): void {
  entry.setAttribute('style', `${entry.getAttribute('style') ?? ''}margin-left:auto;`)
}

/** @purity non-pure */
export function modalElement(
  host: Document,
  modal: OpenModal,
  anchors: Map<string, HTMLElement>,
): DrawnModal {
  const drawn = part(
    host,
    'div',
    modal.surface,
    modalFrameStyle(modal) +
      ('resources' in modal ? rosterBoxStyle() : '') +
      ('droppedTaskNames' in modal ? STYLE.importReportBox : ''),
  )
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = modalTitleRow(host, modal, anchors)
  const body: HTMLElement[] = []
  let watermarkUnlockEntry: TextEntryControl | null = null
  let helpColumns: HelpColumnsDrawn | null = null

  if ('entries' in modal) {
    drawn.setAttribute('data-language', modal.helpLanguage)
    drawn.setAttribute('lang', modal.helpLanguage)
    if (modal.windowState !== 'minimised') helpColumns = helpBodyElement(host, modal)
    if (helpColumns !== null) body.push(helpColumns.body)
  }

  if ('formats' in modal) body.push(...exportChooserBodyElements(host, modal))

  if ('resources' in modal) {
    const scroller = rosterGridElement(host, modal.resources)
    drawn.addEventListener('wheel', rosterSidewaysWheel(scroller), WHEEL_MAY_STOP_DEFAULT)
    body.push(scroller)
  }

  if ('candidates' in modal) {
    for (const candidate of modal.candidates) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-uid', String(candidate.currentUid))
      line.setAttribute('data-incoming-uid', String(candidate.incomingUid))
      const uid = made(host, 'span', STYLE.fieldName)
      uid.textContent =
        candidate.currentUid === candidate.incomingUid
          ? String(candidate.currentUid)
          : `${candidate.currentUid} / ${candidate.incomingUid}`
      const current = made(host, 'span', 'margin-right:0.5em;')
      current.setAttribute('data-side', 'current')
      current.setAttribute('data-unnamed', String(candidate.currentName === null))
      current.textContent = candidate.currentName ?? ''
      const incoming = made(host, 'span', 'margin-right:0.5em;')
      incoming.setAttribute('data-side', 'incoming')
      incoming.setAttribute('data-unnamed', String(candidate.incomingName === null))
      incoming.textContent = candidate.incomingName ?? ''
      line.append(uid, current, incoming)
      body.push(line)
    }
  }

  if ('unreadColumns' in modal) {
    if (modal.unreadText !== '') {
      const said = made(host, 'div', '')
      said.textContent = modal.unreadText
      body.push(said)
    }
    if (modal.unreadNextStep !== '') {
      body.push(nextStepElement(host, modal.unreadNextStep, modal.unreadNextStepLink))
    }
    for (const column of modal.unreadColumns) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-unread-column', column)
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = column
      line.append(name)
      body.push(line)
    }
  }

  if ('droppedTaskNames' in modal) body.push(...importReportElements(host, modal))

  if ('choices' in modal) body.push(...openChooserRows(host, modal, anchors))

  if ('fields' in modal) {
    // TRAP: null, not a map: modal controls must not answer focusPropertyField for panel rows.
    for (const field of modal.fields) body.push(fieldElement(host, field, null))
  }

  if ('weekDays' in modal) {
    // TRAP: not renumbered: WeekDay.dayType (AT-73) counts Sunday as 1 and
    // Project.weekStartDay (AT-17) as 0.
    drawn.setAttribute('data-week-start-day', String(modal.weekStartDay))
    for (const day of modal.weekDays) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(day.ordinal))
      line.setAttribute('data-day-type', String(day.dayType))
      line.setAttribute('data-day-working', String(day.dayWorking))
      body.push(line)
    }
    for (const exception of modal.exceptions) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(exception.ordinal))
      line.setAttribute('data-day-working', String(exception.dayWorking))
      line.setAttribute('data-recurrence-kind', String(exception.recurrenceKind))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = exception.name
      const span = made(host, 'span', '')
      span.textContent = `${exception.fromDate ?? ''} ${exception.toDate ?? ''}`
      line.append(name, span)
      body.push(line)
    }
  }

  if ('question' in modal) {
    const question = made(host, 'div', '')
    question.textContent = modal.question

    // WHY: type=password, not a painted mask, which would leave the characters in the DOM.
    const answerEntry = host.createElement('input')
    answerEntry.setAttribute('type', 'password')
    answerEntry.setAttribute('style', STYLE.watermarkUnlockEntry)
    answerEntry.setAttribute('aria-label', modal.question)
    answerEntry.setAttribute(WATERMARK_UNLOCK_ENTRY_ATTRIBUTE, 'true')
    watermarkUnlockEntry = answerEntry

    const answers = made(host, 'div', STYLE.confirmationAnswers)
    for (const answer of modal.answers) {
      answers.append(confirmationAnswerElement(host, answer))
    }
    body.push(question, answerEntry, answers)
  }

  drawn.replaceChildren(header, ...(isCloseOnlyTitled(modal) ? [closeOnlyTitledBody(host, body)] : body))
  return { element: drawn, watermarkUnlockEntry, helpColumns }
}

/** @purity pure */
function modalFrameStyle(modal: OpenModal): string {
  if ('entries' in modal) return helpWindowStyle(helpPlacedOf(modal))
  return isCloseOnlyTitled(modal) ? closeOnlyTitledFrameStyle(modal) : STYLE.modal
}

/** @purity non-pure */
function closeOnlyTitledBody(host: Document, body: readonly HTMLElement[]): HTMLElement {
  const box = made(host, 'div', 'flex:1 1 auto;min-height:0;overflow:auto;padding:1em;')
  box.replaceChildren(...body)
  return box
}

// see FR-069, FR-036, S-437, S-149, S-457
/** @purity pure */
function helpLegalStyle(): string {
  const gap = NOT_STORED_HELP_SIZES['S-457']
  return (
    `${STYLE.helpLegal}border-top:${NOT_STORED_HELP_SIZES['S-437']}px solid ${PAINT.rule};margin-top:${gap}em;padding-top:${gap}em;` +
    'display:flow-root;'
  )
}

// WHY: floats, so the folded text's summary shares their line (JDG-1391) and the opened text spans the box.
/** @purity pure */
function helpLegalLeadStyle(): string {
  return `float:left;margin-right:${NOT_STORED_HELP_SIZES['S-436']}em;`
}

// see FR-069, FR-036, S-459
/** @purity non-pure */
function helpLegalElement(host: Document, modal: HelpModal): HTMLElement {
  const legal = made(host, 'div', helpLegalStyle())
  const copyright = made(host, 'div', helpLegalLeadStyle())
  copyright.append(linkElement(host, NOT_STORED_HELP_SIZES['S-459'], modal.copyrightNotice))
  const licensedUnder = made(host, 'div', helpLegalLeadStyle())
  licensedUnder.textContent = modal.helpLegal.licensedUnder
  const fullText = made(host, 'details', '')
  const summary = made(host, 'summary', STYLE.helpLegalSummary)
  summary.textContent = modal.helpLegal.fullText
  fullText.append(summary)
  for (const text of [modal.licenceText, ...modal.attributions]) {
    const line = made(host, 'p', STYLE.helpLegalText)
    line.textContent = text
    fullText.append(line)
  }
  legal.append(...helpFootnoteElements(host, modal.footnotes), copyright, licensedUnder, fullText)
  return legal
}

// see FR-036, FR-069, T-335
/** @purity non-pure */
function helpBodyElement(host: Document, modal: HelpModal): HelpColumnsDrawn {
  const body = made(host, 'div', helpBodyStyle())
  const columns = helpColumnsElement(host, modal.entries, openedHelpBodyWidthPx(modal, 0))
  body.append(columns, helpLegalElement(host, modal))
  return { body, columns }
}

// see FR-096, S-517, OP-16
/** @purity pure */
function formatChoicesStyle(): string {
  return `${STYLE.formatChoices}row-gap:${NOT_STORED_EXPORT_CHOOSER_SIZES['S-517']}em;`
}

// see FR-096
/** @purity non-pure */
function exportFormatChoicesElement(host: Document, modal: ExportChooser): HTMLElement {
  const choices = made(host, 'div', formatChoicesStyle())
  for (const format of modal.formats) {
    const choice = made(host, 'button', entryStyle())
    choice.setAttribute('type', 'button')
    // STOP: spec does not decide how a format choice is marked for read-back. Looked in W-4, IF-9, T-024
    // @provisional PND-474
    choice.setAttribute('data-format', format.row)
    const shown = `${format.name} ${format.extension}`
    choice.setAttribute('aria-label', shown)
    choice.textContent = shown
    choices.append(choice)
  }
  return choices
}

// see FR-096, IX-12
/** @purity non-pure */
function exportChooserBodyElements(host: Document, modal: ExportChooser): readonly HTMLElement[] {
  const choices = exportFormatChoicesElement(host, modal)
  if (modal.exportSpanLine === null) return [choices]
  const line = made(host, 'div', STYLE.field)
  line.textContent = modal.exportSpanLine
  return [choices, line]
}

// see OP-16, AM-8, HS-3
/** @purity non-pure */
function openChooserRows(host: Document, modal: OpenChooser, anchors: Map<string, HTMLElement>): readonly HTMLElement[] {
  const rows: HTMLElement[] = []
  const read = modal.incomingFile
  if (read !== null && read.fileName !== null) {
    const file = made(host, 'div', STYLE.field)
    file.textContent = `${modal.fileWord}: ${read.fileName} (${spelledFileSize(read.byteLength)})`
    rows.push(file)
  }
  if (read !== null) {
    const title = made(host, 'div', STYLE.field)
    title.textContent = `${modal.documentTitleWord}: ${read.documentTitle}`
    rows.push(title)
  }
  for (const choice of modal.choices) rows.push(openChooserLine(host, anchoredEntry(host, choice.entry, anchors), choice.hint))
  // WHY: a second IC-52, not anchored, so the tooltip and the anchor stay with the heading row's (OP-16, FR-029).
  const cancel = made(host, 'button', entryStyle())
  cancel.setAttribute('type', 'button')
  cancel.setAttribute('data-icon', CLOSE_SURFACE_ENTRY)
  cancel.setAttribute('aria-label', modal.cancelWord)
  fillEntry(host, cancel, CLOSE_SURFACE_ENTRY)
  rows.push(openChooserLine(host, cancel, modal.cancelWord))
  return rows
}

/** @purity non-pure */
function openChooserLine(host: Document, entry: HTMLElement, words: string): HTMLElement {
  const line = made(host, 'div', STYLE.field)
  const said = made(host, 'span', '')
  said.textContent = words
  line.append(entry, said)
  return line
}

type ImportReport = Extract<OpenModal, { readonly droppedTaskNames: readonly (string | null)[] }>

/** @purity non-pure */
function reasonLines(host: Document, text: string, nextStep: string, taskNames: readonly (string | null)[]): HTMLElement[] {
  const said = made(host, 'div', '')
  said.textContent = text
  const lines: HTMLElement[] = [said]
  if (nextStep !== '') {
    const step = made(host, 'div', STYLE.noticeNextStep)
    step.textContent = nextStep
    lines.push(step)
  }
  for (const name of taskNames) {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(name === null))
    line.textContent = name ?? ''
    lines.push(line)
  }
  return lines
}

// see U-62, FR-023, MG-14
// WHY: each reason that has names gets its words with its names under them (U-62); RS-50 stays when neither has.
/** @purity non-pure */
function importReportElements(host: Document, modal: ImportReport): readonly HTMLElement[] {
  const hasMissing = modal.missingTaskNames.length > 0
  const lines: HTMLElement[] = []
  if (modal.droppedTaskNames.length > 0 || !hasMissing) {
    lines.push(...reasonLines(host, modal.text, modal.nextStep, modal.droppedTaskNames))
  }
  if (hasMissing) lines.push(...reasonLines(host, modal.missingText, modal.missingNextStep, modal.missingTaskNames))
  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(...lines)

  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  dismiss.setAttribute(IMPORT_REPORT_DISMISS_ATTRIBUTE, 'true')
  dismiss.textContent = modal.dismissText
  const wayOut = made(host, 'div', STYLE.confirmationAnswers)
  wayOut.replaceChildren(dismiss)
  return [names, wayOut]
}

// see FR-036, T-335, IF-9, S-455
/** @purity non-pure */
export function helpWindowPainter(host: Document, helpLayer: HTMLElement) {
  let placed: PlacedWindow | null = null
  let drawn: HTMLElement | null = null

  /** @purity non-pure */
  function draw(help: OpenModal | null, isContentChanged: boolean, anchors: () => Map<string, HTMLElement>): void {
    placed = help !== null && 'entries' in help ? helpPlacedOf(help) : null
    if (isContentChanged) {
      const built = help === null ? null : modalElement(host, help, anchors())
      drawn = built === null ? null : built.element
      helpLayer.replaceChildren(...(drawn === null ? [] : [drawn]))
      if (built !== null && help !== null && 'entries' in help) fitHelpColumnFloor(built.helpColumns, help)
      return
    }
    if (drawn !== null && placed !== null) drawn.setAttribute('style', helpWindowStyle(placed))
  }

  return {
    draw,
    answerAt: (asked: PointAsked): ScreenPart | null => windowPartAt(drawn, placed, asked, windowPartOf(HELP_SURFACE)),
  }
}

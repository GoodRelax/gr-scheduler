// DomScreenSurface -- the surfaces opened on top (IN-4), one kind of surface at a time.
// @unit      UF-109  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { CommandItem, OpenModal } from '../../adapter/screen-renderer/screen-renderer'
import {
  IMPORT_REPORT_DISMISS_ATTRIBUTE,
  NOT_STORED_HELP_SIZES,
  NOT_STORED_ICON_SIZES,
  NOT_STORED_RESOURCE_ROSTER_SIZES,
  PAINT,
  STYLE,
  anchoredEntry,
  appendAssignment,
  entryStyle,
  fillEntry,
  made,
  part,
} from './dom-screen-surface'
import { confirmationAnswerElement } from './notices-drawing'
import { paletteGroupRuleStyle } from './command-palette-drawing'
import type { TextEntryControl } from './field-editing'
import { fieldElement } from './properties-panel-drawing'

const ROSTER_CHOSEN_ENTRY = 'IC-67'
const ROSTER_UNCHOSEN_ENTRY = 'IC-68'

// STOP: spec does not decide how parts with no T-103 or T-109 row are marked for read-back. Looked in W-4, IF-9
// @provisional PND-474
const WATERMARK_UNLOCK_ENTRY_ATTRIBUTE = 'data-watermark-unlock'

// see FR-036, T-256
// TRAP: a height bound here (flex:1 with min-height:0, or column-fill over a bounded box) sends a
// block that does not fit into a column added to the right, and the help scrolls sideways.
/** @purity pure */
function helpColumnsStyle(): string {
  return (
    `display:grid;grid-template-columns:repeat(${NOT_STORED_HELP_SIZES['S-202']},minmax(0,1fr));` +
    'column-gap:1.5em;align-items:start;flex:0 0 auto;'
  )
}

// see FR-036
/** @purity pure */
function helpStyle(): string {
  const share = NOT_STORED_HELP_SIZES['S-201'] * 100
  return (
    `width:${share}vw;max-width:${share}vw;` +
    `height:${share}vh;max-height:${share}vh;overflow-x:hidden;overflow-y:auto;` +
    'display:flex;flex-direction:column;' +
    `font-size:${NOT_STORED_HELP_SIZES['S-203']}em;`
  )
}

// see FR-036
// TRAP: the tooltip joins with the same one; EZ-2 forbids the pair built two ways.
const ASSIGNMENT_SEPARATOR = ' \uFF0F '

// see FR-036
/** @purity pure */
function helpIndentStyle(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return `padding-left:calc(${side}px + ${gap}px * 2);`
}

// see FR-099
// STOP: spec does not decide where the selection entry stands on a roster line. Looked in FR-099, IC-67, IC-68, HF-4
// @provisional PND-473
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
  isIndented: boolean,
): { readonly row: HTMLElement; readonly text: HTMLElement } {
  const row = made(host, 'div', STYLE.helpEntry + (isIndented ? helpIndentStyle() : ''))
  row.setAttribute('data-table', line.table)
  row.setAttribute('data-row', line.row)
  if (isIndented) row.setAttribute('data-indent', 'true')

  const glyph = made(host, 'span', STYLE.helpGlyph)
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

  const text = made(host, 'span', STYLE.helpText)
  text.textContent = line.text
  row.append(text)

  const assignment = made(host, 'span', STYLE.helpKeys)
  const written = [line.keys, line.press]
    .filter((one): one is string => one !== null)
    .join(ASSIGNMENT_SEPARATOR)
  if (written !== '') appendAssignment(host, assignment, written, false)
  row.append(assignment)
  return { row, text }
}

type OpenHelpEntry = Extract<OpenModal, { readonly entries: unknown }>['entries'][number]

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
  if (event.deltaMode !== event.DOM_DELTA_LINE) return 1
  const view = scroller.ownerDocument.defaultView
  const lineHeight = view === null ? Number.NaN : Number.parseFloat(view.getComputedStyle(scroller).fontSize)
  return Number.isFinite(lineHeight) ? lineHeight : 1
}

// see FR-036, FR-053, T-256
// WHY: each entry names its column (table T-256), so a block is placed, never flowed.
/** @purity non-pure */
function helpColumnsElement(host: Document, entries: readonly OpenHelpEntry[]): HTMLElement {
  const columns = made(host, 'div', helpColumnsStyle())
  const columnByRow = new Map<string, HTMLElement>()
  let block: HTMLElement | null = null
  let blockName: string | null = null
  let segment: string | null = null
  for (const line of entries) {
    const name = line.block
    const lineSegment = line.segment
    if (block === null || name !== blockName) {
      let column = columnByRow.get(line.column)
      const isColumnTop = column === undefined
      if (column === undefined) {
        column = made(host, 'div', STYLE.helpColumn)
        column.setAttribute('data-help-column', line.column)
        columnByRow.set(line.column, column)
        columns.append(column)
      }
      const opened = made(host, 'div', STYLE.helpBlock)
      opened.setAttribute('data-help-block', name)
      if (!isColumnTop) opened.append(made(host, 'div', paletteGroupRuleStyle()))
      column.append(opened)
      block = opened
      blockName = name
      segment = lineSegment
    } else if (lineSegment !== segment) {
      block.append(made(host, 'div', paletteGroupRuleStyle()))
      segment = lineSegment
    }
    if (line.kind === 'heading') {
      const heading = made(host, 'div', STYLE.helpHeading)
      heading.setAttribute('data-help-heading', line.row)
      heading.textContent = line.text
      block.append(heading)
      continue
    }
    const drawnItem = helpItemElement(host, line, line.glyphs, line.indent)
    block.append(drawnItem.row)
  }
  return columns
}

interface DrawnModal {
  readonly element: HTMLElement
  readonly watermarkUnlockEntry: TextEntryControl | null
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
    STYLE.modal +
      ('entries' in modal ? helpStyle() : '') +
      ('resources' in modal ? rosterBoxStyle() : '') +
      ('droppedTaskNames' in modal ? STYLE.importReportBox : ''),
  )
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = made(host, 'div', STYLE.surfaceHeader)
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = modal.heading
  header.append(heading)
  const legendItem =
    'entries' in modal ? modal.commands.find((item) => item.icon === modal.legend) : undefined
  if (legendItem !== undefined) header.append(helpLegendElement(host, legendItem))
  for (const item of modal.commands) {
    if ('entries' in modal && item.icon === modal.legend) continue
    header.append(anchoredEntry(host, item, anchors))
  }
  const body: HTMLElement[] = []
  let watermarkUnlockEntry: TextEntryControl | null = null

  if ('entries' in modal) {
    drawn.setAttribute('data-language', modal.language)
    body.push(helpColumnsElement(host, modal.entries))
    const legal = made(host, 'details', STYLE.helpLegal)
    const summary = made(host, 'summary', STYLE.helpLegalSummary)
    summary.textContent = modal.copyrightNotice
    legal.append(summary)
    for (const text of [modal.licenceText, ...modal.attributions]) {
      const line = made(host, 'p', STYLE.helpLegalText)
      line.textContent = text
      legal.append(line)
    }
    body.push(legal)
  }

  if ('documentText' in modal) {
    const text = made(host, 'pre', 'white-space:pre-wrap;overflow:auto;')
    text.textContent = modal.documentText
    body.push(text)
  }

  if ('formats' in modal) {
    const choices = made(host, 'div', STYLE.formatChoices)
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
    body.push(choices)
  }

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
      const step = made(host, 'div', STYLE.noticeNextStep)
      step.textContent = modal.unreadNextStep
      body.push(step)
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

  drawn.replaceChildren(header, ...body)
  return { element: drawn, watermarkUnlockEntry }
}

type ImportReport = Extract<OpenModal, { readonly droppedTaskNames: readonly (string | null)[] }>

// see U-62, FR-023
/** @purity non-pure */
function importReportElements(host: Document, modal: ImportReport): readonly HTMLElement[] {
  const said = made(host, 'div', '')
  said.textContent = modal.text
  const lines: HTMLElement[] = [said]
  if (modal.nextStep !== '') {
    const step = made(host, 'div', STYLE.noticeNextStep)
    step.textContent = modal.nextStep
    lines.push(step)
  }
  for (const name of modal.droppedTaskNames) {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(name === null))
    line.textContent = name ?? ''
    lines.push(line)
  }
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

// DomScreenSurface -- the Dialogue Field window: its title row, the utterances, and the one settled by Enter.
// @unit      UF-111  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import {
  windowBoxOf,
  windowNormalBoxOf,
  type DialogueField,
  type DialogueInput,
  type ScreenPart,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  HOST_ENTER,
  NOT_STORED_HELP_SIZES,
  STYLE,
  boxStyle,
  entranceOuterHeightPx,
  made,
} from './dom-screen-surface'
import {
  windowPartAt,
  windowPartOf,
  windowTitleRowElement,
  type PlacedWindow,
  type PointAsked,
} from './window-frame-drawing'

const DIALOGUE_FIELD_ROLE = 'Dialogue Field'

// WHY: the em of S-453 / S-454 is the field's own font size; a host that cannot say so reads the CSS initial.
const FALLBACK_EM_PX = 16

// see AT-129
/** @purity pure */
function stampOf(atMs: number): string {
  return `${new Date(atMs).toISOString().slice(0, 19)}Z`
}

// see FR-066
/** @purity non-pure */
export function fillDialogueMessages(host: Document, box: HTMLElement, field: DialogueField): void {
  const drawn = field.messages.map((message) => {
    const line = made(host, 'div', STYLE.dialogueMessage)
    line.setAttribute('data-sequence', String(message.sequence))
    line.setAttribute('data-author', message.author)
    line.setAttribute('data-settled-at', message.settledAt)
    const who = made(host, 'span', STYLE.dialogueAuthor)
    who.textContent = message.author
    const said = made(host, 'span', '')
    said.textContent = message.text
    line.append(who, said)
    return line
  })
  box.replaceChildren(...drawn)
}

interface Settlement {
  readonly text: string
  readonly settledAt: string
}

// see FR-066, S-453, S-454, WB-1
/** @purity pure */
function defaultFieldBox(canvas: ScreenRect, emPx: number): ScreenRect {
  const width = Math.min(NOT_STORED_HELP_SIZES['S-453'] * emPx, canvas.width)
  const height = Math.min(NOT_STORED_HELP_SIZES['S-454'] * emPx, canvas.height)
  return { x: canvas.x + canvas.width - width, y: canvas.y + canvas.height - height, width, height }
}

// see FR-066, T-335
/** @purity pure */
export function dialogueFieldPlacedOf(field: DialogueField, emPx: number): PlacedWindow {
  const place = windowNormalBoxOf(field.place, defaultFieldBox(field.canvas, emPx), field.canvas)
  const box = windowBoxOf(field.shown, place, field.canvas, entranceOuterHeightPx())
  return { window: 'dialogueField', shown: field.shown, place, box, range: field.canvas }
}

/** @purity semi-pure-b */
function emPxOf(element: HTMLElement): number {
  const read = (globalThis as { getComputedStyle?: (node: Element) => { fontSize: string } }).getComputedStyle
  const fontPx = typeof read === 'function' ? Number.parseFloat(read(element).fontSize) : Number.NaN
  return Number.isFinite(fontPx) && fontPx > 0 ? fontPx : FALLBACK_EM_PX
}

// see AG-11, IF-9
/** @purity non-pure */
function dialogueSettlement(dialogueEntry: HTMLInputElement, readAuthor: () => string, readClockMs: () => number, isUp: () => boolean) {
  let settled: Settlement | null = null
  dialogueEntry.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key !== HOST_ENTER || event.isComposing) return
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (!isUp()) return
    settled = { text: dialogueEntry.value, settledAt: stampOf(readClockMs()) }
    dialogueEntry.value = ''
  })
  return {
    /** @purity semi-pure-b */
    readDialogueInput(): DialogueInput | null {
      const held = settled
      if (!isUp() || held === null) return null
      return { text: held.text, isSettled: true, author: readAuthor(), settledAt: held.settledAt }
    },
    forgetSettled: (): void => void (settled = null),
  }
}

// see FR-066, T-335, IF-9
/** @purity non-pure */
export function dialogueFieldPainter(
  host: Document,
  dialogueField: HTMLElement,
  readAuthor: () => string,
  readClockMs: () => number,
) {
  const titleSlot = made(host, 'div', '')
  const dialogueMessages = made(host, 'div', STYLE.dialogueMessages)
  const dialogueEntry = host.createElement('input')
  dialogueEntry.setAttribute('type', 'text')
  dialogueField.append(titleSlot, dialogueMessages, dialogueEntry)
  let placed: PlacedWindow | null = null
  const settlement = dialogueSettlement(dialogueEntry, readAuthor, readClockMs, () => placed !== null)

  /** @purity non-pure */
  function draw(field: DialogueField | null, anchors: Map<string, HTMLElement>, zIndexStyle: string): void {
    placed = field === null ? null : dialogueFieldPlacedOf(field, emPxOf(dialogueField))
    if (field === null || placed === null) {
      dialogueField.setAttribute('style', STYLE.hidden + zIndexStyle)
      return
    }
    titleSlot.replaceChildren(windowTitleRowElement(host, field.heading, { before: [], titled: field.titleEntries }, anchors, DIALOGUE_FIELD_ROLE))
    // WHY: hidden, not removed: moving the entry out of the tree drops the focus and the typed words (WB-2).
    const unseen = field.shown === 'minimised' ? STYLE.hidden : ''
    dialogueMessages.setAttribute('style', STYLE.dialogueMessages + unseen)
    dialogueEntry.setAttribute('style', STYLE.dialogueEntry + unseen)
    fillDialogueMessages(host, dialogueMessages, field)
    dialogueField.setAttribute('style', STYLE.dialogueField + boxStyle(placed.box) + zIndexStyle)
  }

  return {
    ...settlement,
    draw,
    answerAt: (asked: PointAsked): ScreenPart | null => windowPartAt(dialogueField, placed, asked, windowPartOf(DIALOGUE_FIELD_ROLE)),
  }
}

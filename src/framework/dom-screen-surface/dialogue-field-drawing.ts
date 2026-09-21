// DomScreenSurface -- the Dialogue Field utterances, and the one settled by Enter.
// @unit      UF-111  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  DialogueField,
  DialogueInput,
  ScreenView,
} from '../../adapter/screen-renderer/screen-renderer'
import { HOST_ENTER, STYLE, made } from './dom-screen-surface'
import { panelEdge } from './screen-frame-drawing'

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

// STOP: spec does not decide where the Dialogue Field stands. Looked in SC-4, FR-066
// @provisional PND-151
/** @purity non-pure */
export function placeDialogueField(dialogueField: HTMLElement, view: ScreenView): void {
  if (view.dialogueField === null) {
    dialogueField.setAttribute('style', STYLE.hidden)
    return
  }
  const lane = view.frame.scrollbars.find((one) => one.axis === 'horizontal')
  const propertiesLine = panelEdge(view.frame, 'propertiesPanel')
  const bottom = lane === undefined ? '100%' : `${lane.track.y}px`
  const right = propertiesLine === null ? '100%' : `${propertiesLine.x}px`
  dialogueField.setAttribute(
    'style',
    STYLE.dialogueField + `left:calc(${right} - 24em);top:calc(${bottom} - 14em);`,
  )
}

/** @purity non-pure */
export function dialogueSettlement(
  dialogueEntry: HTMLInputElement,
  readAuthor: () => string,
  readClockMs: () => number,
) {
  let settled: Settlement | null = null
  let isFieldUp = false
  // see AG-11
  /** @purity non-pure */
  function onEntryKeyDown(event: KeyboardEvent): void {
    if (event.key !== HOST_ENTER || event.isComposing) return
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (!isFieldUp) return
    settled = { text: dialogueEntry.value, settledAt: stampOf(readClockMs()) }
    dialogueEntry.value = ''
  }

  dialogueEntry.addEventListener('keydown', onEntryKeyDown)

  // see IF-9, AG-11
  /** @purity semi-pure-b */
  function readDialogueInput(): DialogueInput | null {
    if (!isFieldUp) return null
    const held = settled
    if (held === null) return null
    return { text: held.text, isSettled: true, author: readAuthor(), settledAt: held.settledAt }
  }

  return {
    readDialogueInput,
    markFieldUp: (isUp: boolean): void => {
      isFieldUp = isUp
    },
    forgetSettled: (): void => {
      settled = null
    },
  }
}

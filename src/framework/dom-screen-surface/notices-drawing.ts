// DomScreenSurface -- the notices and the confirmation, drawn in the manner of table T-037.
// @unit      UF-110  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { Confirmation, Notice } from '../../adapter/screen-renderer/screen-renderer'
import {
  CONFIRMATION_ANSWER_ATTRIBUTE,
  NOTICE_DISMISS_KEY_ATTRIBUTE,
  NOT_STORED_CONFIRMATION_RULE_SIZES,
  PAINT,
  ROLE,
  STYLE,
  entryStyle,
  made,
  part,
} from './dom-screen-surface'

const CONFIRMATION_PART_ATTRIBUTE = 'data-confirmation-part'

type LinkedWords = Exclude<NonNullable<Notice['nextStepLinks']>[number], null>

const LINK_TARGET = '_blank'

const LINK_RELATION = 'noopener noreferrer'

const LINK_KEPT_FROM_INPUT: readonly string[] = ['pointerdown', 'pointerup']

const LINK_OPENING_KEY = 'Enter'

// see FR-073, CN-6
/** @purity non-pure */
function linkElement(host: Document, address: string): HTMLElement {
  const link = made(host, 'a', STYLE.noticeLink)
  link.setAttribute('href', address)
  link.setAttribute('target', LINK_TARGET)
  link.setAttribute('rel', LINK_RELATION)
  link.textContent = address
  for (const type of LINK_KEPT_FROM_INPUT) link.addEventListener(type, (event) => event.stopPropagation())
  link.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === LINK_OPENING_KEY) event.stopPropagation()
  })
  return link
}

// see FR-073
/** @purity non-pure */
export function nextStepElement(host: Document, text: string, link?: LinkedWords | null): HTMLElement {
  const line = made(host, 'div', STYLE.noticeNextStep)
  if (link === undefined || link === null) {
    line.textContent = text
    return line
  }
  line.append(host.createTextNode(link.before), linkElement(host, link.address), host.createTextNode(link.after))
  return line
}

// see NT-1, NT-3a, NT-8
/** @purity non-pure */
export function noticeElement(host: Document, notice: Notice): HTMLElement {
  const drawn = made(host, 'div', STYLE.notice)
  drawn.setAttribute('data-manner', notice.manner)
  drawn.setAttribute('role', 'status')
  const text = made(host, 'div', '')
  text.textContent = notice.text
  drawn.append(text)
  if (notice.affectedCount !== null) {
    const count = made(host, 'div', '')
    count.textContent = String(notice.affectedCount)
    drawn.append(count)
    drawn.setAttribute('data-affected-count', String(notice.affectedCount))
  }
  notice.nextSteps.forEach((step, index) => {
    drawn.append(nextStepElement(host, step, notice.nextStepLinks?.[index]))
  })
  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  dismiss.setAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE, notice.dismissKey)
  dismiss.textContent = notice.dismissText
  drawn.append(dismiss)
  return drawn
}

// see NT-7
/** @purity non-pure */
export function confirmationAnswerElement(
  host: Document,
  answer: Confirmation['answers'][number],
): HTMLElement {
  const drawn = made(host, 'button', entryStyle() + STYLE.confirmationAnswer)
  drawn.setAttribute('type', 'button')
  drawn.setAttribute(CONFIRMATION_ANSWER_ATTRIBUTE, answer.answer)
  // WHY: no aria-label: the spans give the name; a copy would stop following the dictionary.
  const initial = made(host, 'span', STYLE.confirmationAnswerInitial)
  initial.textContent = answer.text.slice(0, 1)
  const rest = made(host, 'span', '')
  rest.textContent = answer.text.slice(1)
  drawn.append(initial, rest)
  return drawn
}

// see U-55, NT-7, FR-032, FR-076, T-258
/** @purity non-pure */
export function confirmationElement(host: Document, confirmation: Confirmation): HTMLElement {
  const drawn = part(host, 'div', ROLE.confirmation, STYLE.confirmation)
  drawn.setAttribute('role', 'alertdialog')
  drawn.setAttribute('aria-modal', 'true')
  drawn.setAttribute('data-manner', confirmation.manner)

  const text = made(host, 'div', '')
  text.textContent = confirmation.text

  const items = confirmation.items.map((item) => {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(item.name === null))
    line.setAttribute('data-shown-on-another-row', String(item.isShownOnAnotherRow))
    // TRAP: set the text before appending the mark; the textContent setter replaces every child.
    line.textContent = item.name
    if (item.isShownOnAnotherRow) {
      const mark = made(host, 'span', STYLE.confirmationMark)
      mark.textContent = confirmation.shownOnAnotherRowMark
      line.append(mark)
    }
    return line
  })

  const answers = made(host, 'div', STYLE.confirmationHeaderAnswers)
  for (const answer of confirmation.answers) {
    answers.append(confirmationAnswerElement(host, answer))
  }

  const header = made(host, 'div', STYLE.confirmationHeader)
  header.setAttribute(CONFIRMATION_PART_ATTRIBUTE, 'header')
  header.replaceChildren(text, answers)
  // see CQ-4
  if (items.length === 0) {
    drawn.replaceChildren(header)
    return drawn
  }

  const rule = made(host, 'div', confirmationRuleStyle())
  rule.setAttribute(CONFIRMATION_PART_ATTRIBUTE, 'rule')
  const names = made(host, 'div', STYLE.confirmationNames)
  names.setAttribute(CONFIRMATION_PART_ATTRIBUTE, 'list')
  names.replaceChildren(...items)
  drawn.replaceChildren(header, rule, names)
  return drawn
}

// see CQ-2, S-242
/** @purity pure */
function confirmationRuleStyle(): string {
  const thickness = NOT_STORED_CONFIRMATION_RULE_SIZES['S-242']
  // WHY: the negative side margins undo STOPPING_BOX's padding, so the rule spans the whole face.
  return (
    `flex:none;align-self:stretch;height:${thickness}px;margin:0.5em -1em;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

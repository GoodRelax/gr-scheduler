// DomScreenSurface -- the editing of text fields: focus, Esc back, Enter and a press outside settle.
// @unit      UF-107  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { FieldCommit, FieldEditNotice, PropertyFieldKey } from '../../adapter/screen-renderer/screen-renderer'
import { HOST_ENTER, STYLE, made } from './dom-screen-surface'

// WHY: not an attribute: a key spelled into one must be parsed back, and a separator breaks that.
export const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>()

const HOST_ESCAPE_KEY = 'Escape'

const HOST_KEY_RELEASE = 'keyup'

const HOST_DELETE_KEY = 'Delete'

const HOST_BACKSPACE_KEY = 'Backspace'

const HOST_DATE_INPUT_TYPE = 'date'

const UNASSIGN_TEXT = '-'

export interface TextEntryControl {
  value: string
  blur?: () => void
  focus?: () => void
  select?: () => void
}

export const TYPED_CONTROLS = new WeakSet<object>()

/** @purity pure */
function textEntryControlOf(target: unknown): TextEntryControl | null {
  if (target === null || typeof target !== 'object') return null
  if (!TYPED_CONTROLS.has(target)) return null
  const drawn = target as Partial<TextEntryControl>
  return typeof drawn.value === 'string' ? (target as TextEntryControl) : null
}

/** @purity pure */
function isChorded(key: Partial<KeyboardEvent>): boolean {
  return key.ctrlKey === true || key.altKey === true || key.metaKey === true
}

// WHY: AS-3; the chooser takes no text, so Del would reach FR-046 and delete the task; it commits '-'.
/** @purity non-pure */
function assigneeLineDeleted(event: Event): FieldCommit | null {
  const key = event as Partial<KeyboardEvent>
  if (key.key !== HOST_DELETE_KEY || isChorded(key)) return null
  const drawn = textEntryControlOf(event.target) === null ? CONTROL_KEYS.get(event.target as Element) : undefined
  if (drawn === undefined || drawn.key.holder !== 'assignment' || key.shiftKey === true) return null
  if (typeof event.preventDefault === 'function') event.preventDefault()
  if (typeof event.stopPropagation === 'function') event.stopPropagation()
  return { row: drawn.row, key: drawn.key, text: UNASSIGN_TEXT }
}

/** @purity pure */
function rowOf(control: TextEntryControl): string {
  return CONTROL_KEYS.get(control as unknown as Element)?.row ?? ''
}

/** @purity pure */
function fieldCommitOf(target: unknown): FieldCommit | null {
  if (target === null || typeof target !== 'object') return null
  const named = CONTROL_KEYS.get(target as Element)
  if (named === undefined) return null
  const input = target as HTMLInputElement
  const text = input.type === 'checkbox' ? String(input.checked) : input.value
  return { row: named.row, key: named.key, text }
}

const PANEL_KEY_SEPARATOR = '#'

/** @purity non-pure */
export function fieldEditingOf(host: Document, propertiesPanel: HTMLElement) {
  let watermarkUnlockEntry: TextEntryControl | null = null
  let fieldCommit: FieldCommit | null = null
  let commitsHandedOut = 0
  const fieldEditNotices: FieldEditNotice[] = []

  // see IF-9
  /** @purity non-pure */
  function noteFieldEdit(kind: FieldEditNotice['kind'], row: string): void {
    fieldEditNotices.push({ kind, row })
  }

  // see FR-031, UN-3
  /** @purity non-pure */
  function onFieldChange(event: Event): void {
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    const target: unknown = event.target
    if (target === (heldTextControl as unknown) && commit.text === heldTextValueAtFocus) return
    fieldCommit = commit
  }

  propertiesPanel.addEventListener('change', onFieldChange)

  const typedControlsByRow = new Map<string, TextEntryControl>()

  // see MK-13
  /** @purity non-pure */
  function focusPropertyField(row: string): boolean {
    if (row === DOCUMENT_TITLE_ROW) {
      openDocumentTitleField()
      const entry = documentTitleEntry
      return entry === null || isFocusOn(entry) || focusAndChoose(entry)
    }
    // WHY: a held control that takes no text stops the panel redraw, so the fields drawn may be
    // the last choice's; let it go, and the next frame draws the field this choice asks for.
    if (isFieldHeld && heldTextControl === null) {
      const active: unknown = activeElementOfHost()
      if (propertiesPanel.contains(active as Node)) (active as HTMLElement).blur()
      isFieldHeld = false
      return false
    }
    const control = typedControlsByRow.get(row)
    return control === undefined || focusAndChoose(control)
  }

  /** @purity non-pure */
  function focusAndChoose(control: TextEntryControl): boolean {
    if (typeof control.focus === 'function') control.focus()
    // TRAP: select after focus, or the host's own focus handling moves the caret afterwards.
    if (typeof control.select === 'function') control.select()
    return isFocusOn(control)
  }

  // WHY: a host with no activeElement cannot say where the focus is, so it is read as in.
  /** @purity semi-pure-b */
  function isFocusOn(control: TextEntryControl): boolean {
    const active = activeElementOfHost()
    return active === undefined || active === control
  }

  /** @purity semi-pure-b */
  function activeElementOfHost(): unknown {
    return (host as { readonly activeElement?: unknown }).activeElement
  }

  let isFieldHeld = false
  let isNoticeShowing = false
  // see NT-8
  /** @purity semi-pure-b */
  function isPressTakenByStandingNotice(key: unknown): boolean {
    if (!isNoticeShowing) return false
    return key === HOST_ENTER || key === HOST_ESCAPE_KEY
  }
  let heldTextControl: TextEntryControl | null = null
  // see IF-9, T-292
  /** @purity non-pure */
  function holdText(control: TextEntryControl | null): void {
    const was = heldTextControl
    if (was === control) return
    heldTextControl = control
    if (was !== null) noteFieldEdit('ended', rowOf(was))
    if (control !== null) noteFieldEdit('began', rowOf(control))
  }
  let heldTextValueAtFocus = ''
  let isHeldTextTakenBack = false
  // see IN-4, IN-5a
  // WHY: released on the Esc key release, not in a microtask: a microtask runs between two
  // keydown listeners, so one Esc would cancel the edit and put the panel away.
  /** @purity non-pure */
  function releaseTakenBackText(held: TextEntryControl): void {
    if (heldTextControl !== held || !isHeldTextTakenBack) return
    if (typeof held.blur === 'function') held.blur()
    holdText(null)
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  }
  // TRAP: not a new edit: the date entry raises focusin again when a script sets its value.
  propertiesPanel.addEventListener('focusin', (event: Event) => {
    isFieldHeld = true
    const control = textEntryControlOf(event.target)
    const isSameEdit = control !== null && control === heldTextControl
    if (isSameEdit) return
    holdText(control)
    heldTextValueAtFocus = heldTextControl === null ? '' : heldTextControl.value
    isHeldTextTakenBack = false
  })
  propertiesPanel.addEventListener('focusout', () => {
    isFieldHeld = false
    holdText(null)
    heldTextValueAtFocus = ''
    isHeldTextTakenBack = false
  })
  propertiesPanel.addEventListener('input', () => {
    isHeldTextTakenBack = false
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
    if (isHeldTextTakenBack) {
      releaseTakenBackText(held)
      return
    }
    // TRAP: do not let go of the control on this press: this listener runs before the shell's,
    // so the ladder would spend a second level on one press.
    held.value = heldTextValueAtFocus
    isHeldTextTakenBack = true
  })

  // WHY: the host's date entry clears one segment per press, which leaves an invalid date that
  // commits nothing; one press empties the whole field, which commits as an emptied field does.
  /** @purity non-pure */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    fieldCommit = assigneeLineDeleted(event) ?? fieldCommit
    const held = heldTextControl
    if (held === null || (held as Partial<HTMLInputElement>).type !== HOST_DATE_INPUT_TYPE) return
    const key = event as Partial<KeyboardEvent>
    if ((key.key !== HOST_DELETE_KEY && key.key !== HOST_BACKSPACE_KEY) || isChorded(key)) return
    if (typeof event.preventDefault === 'function') event.preventDefault()
    held.value = ''
    isHeldTextTakenBack = false
    onFieldChange(event)
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
    const held = heldTextControl
    if (held === null || !isHeldTextTakenBack) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    releaseTakenBackText(held)
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    const key = event as Partial<KeyboardEvent>
    if (key.key !== HOST_ENTER || key.isComposing === true) return
    if (key.ctrlKey === true || key.altKey === true) return
    if (key.metaKey === true || key.shiftKey === true) return
    if (isPressTakenByStandingNotice(HOST_ENTER)) return
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    if (commit.text !== heldTextValueAtFocus) fieldCommit = commit
    heldTextValueAtFocus = commit.text
    // TRAP: blur before clearing heldTextControl: onFieldChange drops the repeated change only
    // while heldTextControl names the control, or one value is written twice.
    if (typeof held.blur === 'function') held.blur()
    holdText(null)
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  })

  // WHY: on the host, not the root or readScreenPartAt: the schedule is outside this tree,
  // and readScreenPartAt is also asked on hover, which would end an edit.
  /** @purity non-pure */
  if (typeof host.addEventListener === 'function') {
    host.addEventListener('pointerdown', settleOnPressOutside)
  }

  // see IN-6, FR-020
  /** @purity non-pure */
  function releaseWatermarkUnlockOnPressOutside(event: Event): void {
    const field = watermarkUnlockEntry
    if (field === null || !isWatermarkUnlockHeld) return
    if ((event as { target?: unknown }).target === (field as unknown)) return
    if (typeof field.blur === 'function') field.blur()
    holdWatermarkUnlock(false)
    isWatermarkUnlockTakenBack = false
  }

  /** @purity non-pure */
  function settleOnPressOutside(event: Event): void {
    releaseWatermarkUnlockOnPressOutside(event)
    settleDocumentTitleOnPressOutside(event)
    const held = heldTextControl
    if (held === null) return
    const pressedOn: unknown = (event as { target?: unknown }).target
    if (pressedOn === (held as unknown)) return

    const commit = fieldCommitOf(held)
    if (commit !== null && commit.text !== heldTextValueAtFocus) {
      fieldCommit = commit
      heldTextValueAtFocus = commit.text
    }
    isHeldTextTakenBack = false

    if (textEntryControlOf(pressedOn) !== null) return

    if (typeof held.blur === 'function') held.blur()
    holdText(null)
    heldTextValueAtFocus = ''
    isFieldHeld = false
  }

  let documentTitleEntry: TextEntryControl | null = null
  let documentTitleBox: HTMLElement | null = null
  let documentTitleShown = ''
  let documentTitleValueAtFocus = ''
  let isDocumentTitleTakenBack = false

  const DOCUMENT_TITLE_ROW = 'U-27'
  const WATERMARK_UNLOCK_ROW = 'U-60'
  const DOCUMENT_TITLE_KEY: PropertyFieldKey = { holder: 'project', column: 'title' }

  // see FR-035
  /** @purity non-pure */
  function openDocumentTitleField(): void {
    const box = documentTitleBox
    if (box === null || documentTitleEntry !== null) return
    const drawn = made(host, 'input', STYLE.documentTitleEntry)
    drawn.setAttribute('type', 'text')
    drawn.setAttribute('data-field-row', DOCUMENT_TITLE_ROW)
    const entry = drawn as unknown as TextEntryControl
    entry.value = documentTitleShown
    CONTROL_KEYS.set(drawn, { row: DOCUMENT_TITLE_ROW, key: DOCUMENT_TITLE_KEY })
    TYPED_CONTROLS.add(drawn)
    // TRAP: the field goes inside the box, not in its place, or a point on the name answers no part.
    box.replaceChildren(drawn)
    documentTitleEntry = entry
    noteFieldEdit('began', DOCUMENT_TITLE_ROW)
    documentTitleValueAtFocus = documentTitleShown
    isDocumentTitleTakenBack = false
    // TRAP: watch before focusing: the host may raise focusin or focusout on the focus below.
    watchDocumentTitleField(drawn, entry)
    if (typeof entry.focus === 'function') entry.focus()
    if (typeof entry.select === 'function') entry.select()
  }

  /** @purity non-pure */
  function closeDocumentTitleField(): void {
    if (documentTitleEntry === null) return
    documentTitleEntry = null
    noteFieldEdit('ended', DOCUMENT_TITLE_ROW)
    documentTitleValueAtFocus = ''
    isDocumentTitleTakenBack = false
    // TRAP: clear the entry before rewriting the box: a focusout on the removed field must find nothing.
    if (documentTitleBox !== null) documentTitleBox.textContent = documentTitleShown
  }

  // see FR-035, IN-6
  /** @purity non-pure */
  function settleDocumentTitle(): void {
    const entry = documentTitleEntry
    if (entry === null) return
    if (entry.value === '') {
      entry.value = documentTitleValueAtFocus
      return
    }
    if (entry.value === documentTitleValueAtFocus) return
    const commit = fieldCommitOf(entry)
    if (commit === null) return
    fieldCommit = commit
    documentTitleValueAtFocus = commit.text
  }

  /** @purity non-pure */
  function settleDocumentTitleOnPressOutside(event: Event): void {
    const held = documentTitleEntry
    if (held === null) return
    if ((event as { target?: unknown }).target === (held as unknown)) return
    settleDocumentTitle()
    if (typeof held.blur === 'function') held.blur()
    closeDocumentTitleField()
  }

  // see SK-19, IN-4
  /** @purity non-pure */
  function watchDocumentTitleField(field: HTMLElement, entry: TextEntryControl): void {
    const isStanding = (): boolean => documentTitleEntry === entry

    field.addEventListener('change', () => {
      if (!isStanding()) return
      settleDocumentTitle()
    })
    field.addEventListener('input', () => {
      if (!isStanding()) return
      isDocumentTitleTakenBack = false
    })
    field.addEventListener('focusout', () => {
      if (!isStanding()) return
      closeDocumentTitleField()
    })
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isDocumentTitleTakenBack) {
        closeDocumentTitleField()
        return
      }
      // TRAP: do not close the field on this press: this listener runs before the shell's (IN-4).
      entry.value = documentTitleValueAtFocus
      isDocumentTitleTakenBack = true
    })
    field.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      if (!isStanding() || !isDocumentTitleTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      closeDocumentTitleField()
    })
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      const key = event as Partial<KeyboardEvent>
      if (key.key !== HOST_ENTER || key.isComposing === true) return
      if (key.ctrlKey === true || key.altKey === true) return
      if (key.metaKey === true || key.shiftKey === true) return
      if (isPressTakenByStandingNotice(HOST_ENTER)) return
      settleDocumentTitle()
      closeDocumentTitleField()
    })
  }

  // see FR-020
  /** @purity semi-pure-b */
  function readWatermarkUnlockAnswer(): string {
    return watermarkUnlockEntry === null ? '' : watermarkUnlockEntry.value
  }

  // WHY: held by focus, not by contents: a keydown is answered before the character lands,
  // so the first keystroke would reach table T-036.
  let isWatermarkUnlockHeld = false
  // see IF-9, T-292
  /** @purity non-pure */
  function holdWatermarkUnlock(isHeld: boolean): void {
    if (isHeld === isWatermarkUnlockHeld) return
    isWatermarkUnlockHeld = isHeld
    noteFieldEdit(isHeld ? 'began' : 'ended', WATERMARK_UNLOCK_ROW)
  }
  let isWatermarkUnlockTakenBack = false
  // see FR-020
  /** @purity non-pure */
  function watchWatermarkUnlock(surface: HTMLElement): void {
    // WHY: focused here, not by the browser: the input seam prevents this pointerdown, and a
    // prevented pointerdown gives no focus.
    surface.addEventListener('pointerdown', (event: Event) => {
      const field = watermarkUnlockEntry
      if (field === null) return
      if ((event as { target?: unknown }).target !== (field as unknown)) return
      if (typeof field.focus === 'function') field.focus()
    })
    surface.addEventListener('focusin', (event: Event) => {
      holdWatermarkUnlock(
        watermarkUnlockEntry !== null &&
          (event as { target?: unknown }).target === (watermarkUnlockEntry as unknown),
      )
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('focusout', () => {
      holdWatermarkUnlock(false)
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('input', () => {
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('keydown', (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockHeld) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isWatermarkUnlockTakenBack) {
        releaseTakenBackWatermarkUnlock(held)
        return
      }
      held.value = ''
      isWatermarkUnlockTakenBack = true
    })

    /** @purity non-pure */
    surface.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      releaseTakenBackWatermarkUnlock(held)
    })
  }

  // see IN-4, WS-2
  /** @purity non-pure */
  function releaseTakenBackWatermarkUnlock(held: TextEntryControl): void {
    if (watermarkUnlockEntry !== held || !isWatermarkUnlockTakenBack) return
    if (typeof held.blur === 'function') held.blur()
    holdWatermarkUnlock(false)
    isWatermarkUnlockTakenBack = false
  }

  // see IN-5a, IF-9, WS-2
  /** @purity semi-pure-b */
  function hasUnsettledTextEntry(): boolean {
    return heldTextControl !== null || isWatermarkUnlockHeld || documentTitleEntry !== null
  }

  /** @purity semi-pure-b */
  function readFieldCommit(): FieldCommit | null {
    const held = fieldCommit
    fieldCommit = null
    if (held !== null) commitsHandedOut += 1
    return held
  }

  // see IF-9
  /** @purity semi-pure-b */
  function readFieldEditNotices(): readonly FieldEditNotice[] {
    return fieldEditNotices.splice(0)
  }

  return {
    typedControlsByRow,
    isFieldHeld: (): boolean => isFieldHeld,
    panelKeyAfterCommits: (described: string): string =>
      `${described}${PANEL_KEY_SEPARATOR}${commitsHandedOut}`,
    isDocumentTitleOpen: (): boolean => documentTitleEntry !== null,
    holdDocumentTitle: (box: HTMLElement, shown: string): void => {
      documentTitleBox = box
      documentTitleShown = shown
    },
    holdWatermarkUnlock: (
      drawnModal: {
        readonly element: HTMLElement
        readonly watermarkUnlockEntry: TextEntryControl | null
      } | null,
    ): void => {
      watermarkUnlockEntry = drawnModal === null ? null : drawnModal.watermarkUnlockEntry
      if (drawnModal !== null && drawnModal.watermarkUnlockEntry !== null) {
        watchWatermarkUnlock(drawnModal.element)
      }
    },
    holdNoticeShowing: (isShowing: boolean): void => {
      isNoticeShowing = isShowing
    },
    focusPropertyField,
    readWatermarkUnlockAnswer,
    readFieldCommit,
    hasUnsettledTextEntry,
    readFieldEditNotices,
  }
}
